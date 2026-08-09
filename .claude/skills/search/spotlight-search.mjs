#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    query: '',
    queries: [],
    mode: 'auto',
    top: 40,
    json: true,
    includeNoisy: false,
    explain: false,
    mergeBy: 'global',
    graphJson: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--mode') {
      args.mode = argv[i + 1] ?? args.mode;
      i += 1;
    } else if (token === '--queries-json') {
      const raw = argv[i + 1] ?? '[]';
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          args.queries = parsed.map((v) => String(v ?? '').trim()).filter(Boolean);
        }
      } catch {
        // handled by caller validation
      }
      i += 1;
    } else if (token === '--query-file') {
      const filePath = argv[i + 1];
      try {
        const fileContent = filePath ? readFileSync(filePath, 'utf8') : '[]';
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed)) {
          args.queries = parsed.map((v) => String(v ?? '').trim()).filter(Boolean);
        }
      } catch {
        // handled by caller validation
      }
      i += 1;
    } else if (token === '--top') {
      args.top = Number.parseInt(argv[i + 1] ?? String(args.top), 10);
      i += 1;
    } else if (token === '--merge-by') {
      args.mergeBy = argv[i + 1] ?? args.mergeBy;
      i += 1;
    } else if (token === '--text') {
      args.json = false;
    } else if (token === '--json') {
      args.json = true;
    } else if (token === '--include-noisy') {
      args.includeNoisy = true;
    } else if (token === '--explain') {
      args.explain = true;
    } else if (token === '--graph-json') {
      args.graphJson = true;
    } else if (!args.query) {
      args.query = token;
    } else {
      args.query += ` ${token}`;
    }
  }
  return args;
}

function runCommand(cmd, cmdArgs, cwd) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
  return {
    ok: res.status === 0,
    status: res.status ?? 1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    error: res.error ? String(res.error.message || res.error) : null
  };
}

function runCommandFallback(candidates, cwd) {
  for (const c of candidates) {
    const res = runCommand(c.cmd, c.args, cwd);
    if (!(res.error && /command not found|ENOENT/i.test(res.error))) return { ...res, invoked: [c.cmd, ...c.args].join(' ') };
  }
  return { ok: false, status: 127, stdout: '', stderr: '', error: 'no-candidate-found', invoked: candidates.map((c) => c.cmd).join(' | ') };
}

function detectIntent(query) {
  const q = query.toLowerCase();
  if (/all|spotlight|everything|full|sentence|semantic/.test(q)) return 'all';
  if (/circular|dependenc|import graph|dag|architecture/.test(q)) return 'arch';
  if (/symbol|definition|where is|where's|find function|find class/.test(q)) return 'symbol';
  if (/pattern|shape|ast|signature/.test(q)) return 'ast';
  if (/cache|artifact|generated|tracked|gitignore|hygiene/.test(q)) return 'hygiene';
  return 'exact';
}

function parseRg(stdout, engine) {
  const hits = [];
  for (const line of stdout.split('\n')) {
    if (!line) continue;
    const m = line.match(/^(.+?):(\d+):(.*)$/);
    if (!m) continue;
    hits.push({
      engine,
      kind: 'text',
      path: m[1],
      line: Number.parseInt(m[2], 10),
      snippet: m[3].trim()
    });
  }
  return hits;
}

function parseSg(stdout, engine) {
  const hits = [];
  for (const line of stdout.split('\n')) {
    if (!line) continue;
    const m = line.match(/^(.+?):(\d+):(.*)$/);
    if (!m) continue;
    hits.push({
      engine,
      kind: 'ast',
      path: m[1],
      line: Number.parseInt(m[2], 10),
      snippet: m[3].trim()
    });
  }
  return hits;
}

function parseAstIndexSymbol(stdout, engine) {
  const hits = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s+([^\[]+)\[([^\]]+)\]:\s+(.+):(\d+)/);
    if (!m) continue;
    hits.push({
      engine,
      kind: `symbol:${m[2].trim()}`,
      path: m[3].trim(),
      line: Number.parseInt(m[4], 10),
      snippet: m[1].trim()
    });
  }
  return hits;
}

function parseAstIndexSearch(stdout, engine) {
  const hits = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s+\[\d+\]\s+(.+):(\d+)\s+\(([^)]+)\)\s*$/);
    if (!m) continue;
    hits.push({
      engine,
      kind: `semantic:${m[3].trim()}`,
      path: m[1].trim(),
      line: Number.parseInt(m[2], 10),
      snippet: ''
    });
  }
  return hits;
}

function parseGrepmaxSearch(stdout, engine) {
  const hits = [];
  const lines = stdout.split('\n');
  let active = null;
  for (const line of lines) {
    const h = line.match(/^(.+?):(\d+)\s+\[(.+?)\]\s*$/);
    if (h) {
      active = {
        engine,
        kind: `semantic:${h[3].trim()}`,
        path: h[1].trim(),
        line: Number.parseInt(h[2], 10),
        snippet: ''
      };
      hits.push(active);
      continue;
    }
    if (active && line.trim() && !line.startsWith('Found ') && !line.startsWith('gmax results')) {
      active.snippet = `${active.snippet} ${line.trim()}`.trim();
    }
  }
  return hits;
}

function parseMadgeCircular(stdout, engine) {
  const hits = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\d+\)\s+(.+)$/);
    if (!m) continue;
    const chain = m[1].trim();
    const start = chain.split(' > ')[0]?.trim() ?? '';
    if (!start) continue;
    hits.push({
      engine,
      kind: 'architecture:circular',
      path: start,
      line: null,
      snippet: chain
    });
  }
  return hits;
}

function parseMadgeGraph(stdout, cwd) {
  const edges = [];
  const nodes = new Set();
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { nodes: [], edges: [] };
  }
  for (const [srcRaw, deps] of Object.entries(parsed || {})) {
    const src = String(srcRaw || '').trim();
    if (!src) continue;
    const srcNorm = src.replace(/\\/g, '/');
    nodes.add(srcNorm);
    const depList = Array.isArray(deps) ? deps : [];
    for (const depRaw of depList) {
      const depNorm = String(depRaw || '').trim().replace(/\\/g, '/');
      if (!depNorm) continue;
      nodes.add(depNorm);
      edges.push({
        type: 'file_import',
        from: srcNorm,
        to: depNorm,
        source: 'madge'
      });
    }
  }
  return { nodes: Array.from(nodes), edges };
}

function gatherStoryFiles(rootDir) {
  const out = [];
  if (!existsSync(rootDir)) return out;
  const entries = readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...gatherStoryFiles(abs));
      continue;
    }
    if (entry.isFile() && /^S-.*\.ts$/.test(entry.name)) out.push(abs);
  }
  return out;
}

function parseStoryTopology(cwd) {
  const root = path.join(cwd, 'workflow', 'stories');
  const storyFiles = gatherStoryFiles(root);
  const nodes = new Set();
  const edges = [];
  for (const abs of storyFiles) {
    const rel = path.relative(cwd, abs).replace(/\\/g, '/');
    nodes.add(rel);
    let content = '';
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const filePathMatches = content.matchAll(/path:\s*'([^']+)'/g);
    for (const m of filePathMatches) {
      const target = String(m[1] || '').trim().replace(/\\/g, '/');
      if (!target) continue;
      nodes.add(target);
      edges.push({
        type: 'story_file',
        from: rel,
        to: target,
        source: 'story-contract'
      });
    }
    const depBlock = content.match(/dependsOnDone:\s*\[([\s\S]*?)\]/m);
    if (depBlock) {
      const ids = Array.from(depBlock[1].matchAll(/'([^']+)'/g)).map((m) => String(m[1] || '').trim());
      for (const id of ids) {
        if (!id) continue;
        const target = `workflow/stories/${id}.ts`;
        edges.push({
          type: 'story_story',
          from: rel,
          to: target,
          source: 'story-contract'
        });
      }
    }
  }
  return { nodes: Array.from(nodes), edges };
}

function scoreHit(hit, query) {
  let score = 0;
  if (hit.engine === 'rg') score += 3;
  if (hit.engine === 'sg') score += 4;
  if (hit.engine === 'ast-index:symbol') score += 5;
  if (hit.engine === 'ast-index:search') score += 2;
  if (hit.engine === 'grepmax:search') score += 6;
  if (hit.engine === 'madge:circular') score += 5;
  if (hit.engine === 'hygiene') score += 5;
  if (/tools\/|apps\/|packages\/|libs\/|workflow\//.test(hit.path)) score += 2;
  if (/session\.md$|scratch\.md$|plan\.md$/.test(hit.path)) score -= 3;
  if (hit.snippet && query) {
    const qTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8);
    const snippetLower = hit.snippet.toLowerCase();
    const overlap = qTokens.filter((t) => snippetLower.includes(t)).length;
    score += overlap;
  }
  return score;
}

function dedupeHits(hits) {
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    const key = `${hit.path}::${hit.line ?? 0}::${hit.snippet}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

function filterNoise(hits, includeNoisy) {
  if (includeNoisy) return hits;
  const noisy = [
    /^node_modules\//,
    /\/node_modules\//,
    /^apps\/site\/\.next\//,
    /^apps\/site\/out\//,
    /\/dist\//,
    /^session\.md$/,
    /^scratch\.md$/,
    /^plan\.md$/
  ];
  return hits.filter((h) => !noisy.some((rx) => rx.test(h.path)));
}

function runSpotlight({ query, mode, cwd }) {
  const warnings = [];
  const enginesRun = [];
  const hits = [];
  const effectiveMode = mode === 'auto' ? detectIntent(query) : mode;

  const runAll = effectiveMode === 'all';
  const needAst = runAll || effectiveMode === 'ast' || effectiveMode === 'exact' || effectiveMode === 'symbol';
  const needSymbol = runAll || effectiveMode === 'symbol' || effectiveMode === 'exact';
  const needSemantic = runAll || effectiveMode === 'exact' || effectiveMode === 'symbol' || /[ .,!?:;-]/.test(query);
  const needArch = runAll || effectiveMode === 'arch';
  const needHygiene = runAll || effectiveMode === 'hygiene';

  const rg = runCommand('rg', ['-n', query, '.'], cwd);
  enginesRun.push('rg');
  if (rg.stdout) hits.push(...parseRg(rg.stdout, 'rg'));
  if (!rg.ok && rg.status !== 1) warnings.push(`rg failed: ${rg.error || rg.stderr.trim()}`);

  if (needAst) {
    const sg = runCommand('sg', ['run', '-p', query, '.', '--lang', 'ts'], cwd);
    enginesRun.push('sg');
    if (sg.stdout) hits.push(...parseSg(sg.stdout, 'sg'));
    if (!sg.ok && sg.status !== 1) warnings.push('sg produced no matches or failed pattern parse');
  }

  if (needSymbol) {
    const astIndexBin = 'pnpm';
    const astSymbol = runCommand(astIndexBin, ['exec', 'ast-index', 'symbol', query], cwd);
    enginesRun.push('ast-index:symbol');
    if (astSymbol.stdout.includes('Index not found')) {
      warnings.push('ast-index index missing: run `pnpm exec ast-index rebuild`');
    } else {
      hits.push(...parseAstIndexSymbol(astSymbol.stdout, 'ast-index:symbol'));
    }

    const astSearch = runCommand(astIndexBin, ['exec', 'ast-index', 'search', query], cwd);
    enginesRun.push('ast-index:search');
    if (!astSearch.stdout.includes('Index not found')) {
      hits.push(...parseAstIndexSearch(astSearch.stdout, 'ast-index:search'));
    }
  }

  if (needSemantic) {
    const semantic = runCommandFallback(
      [
        { cmd: 'gmax', args: ['search', query, '.'] },
        { cmd: 'npx', args: ['--yes', 'grepmax', 'search', query, '.'] }
      ],
      cwd
    );
    enginesRun.push('grepmax:search');
    if (semantic.stdout) hits.push(...parseGrepmaxSearch(semantic.stdout, 'grepmax:search'));
    if (!semantic.ok && semantic.status !== 1) warnings.push(`semantic search failed: ${semantic.error || semantic.stderr.trim()}`);
  }

  if (needArch) {
    const madge = runCommandFallback(
      [
        {
          cmd: 'madge',
          args: ['--circular', '--extensions', 'ts,tsx,js,mjs,cjs', 'packages', 'apps', 'libs', 'tools']
        },
        {
          cmd: 'npx',
          args: ['--yes', 'madge', '--circular', '--extensions', 'ts,tsx,js,mjs,cjs', 'packages', 'apps', 'libs', 'tools']
        }
      ],
      cwd
    );
    enginesRun.push('madge:circular');
    if (madge.stdout) hits.push(...parseMadgeCircular(madge.stdout, 'madge:circular'));
    if (!madge.ok && madge.status !== 1) warnings.push(`architecture graph search failed: ${madge.error || madge.stderr.trim()}`);
  }

  if (needHygiene) {
    const hygiene = runCommand(
      'sh',
      [
        '-lc',
        "git ls-files | rg '(^|/)\\.memory/|\\.db$|\\.tsbuildinfo$|^plan\\.md$|^scratch\\.md$|^session\\.md$|^notes/'"
      ],
      cwd
    );
    enginesRun.push('hygiene');
    if (hygiene.stdout) {
      for (const line of hygiene.stdout.split('\n')) {
        if (!line) continue;
        hits.push({ engine: 'hygiene', kind: 'hygiene', path: line.trim(), line: null, snippet: 'tracked-file' });
      }
    }
  }

  return { hits, enginesRun, warnings, effectiveMode };
}

function printText(result) {
  const { hits } = result;
  console.log(`hits: ${hits.length}`);
  for (const hit of hits) {
    console.log(`${hit.path}${hit.line ? `:${hit.line}` : ''}${hit.snippet ? `:: ${hit.snippet}` : ''}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const queries = args.queries.length > 0 ? args.queries : (args.query ? [args.query] : []);
  if (queries.length === 0) {
    console.error('Usage: node tools/spotlight-search.mjs "<query>" [--queries-json \'["q1","q2"]\'] [--mode auto|all|exact|ast|symbol|hygiene|arch] [--top N] [--json|--text] [--include-noisy] [--explain]');
    process.exit(2);
  }

  const cwd = process.cwd();
  const started = Date.now();
  const allWarnings = [];
  const engines = new Set();
  const rawHits = [];
  const perQuery = [];

  for (const q of queries) {
    const { hits, enginesRun, warnings, effectiveMode } = runSpotlight({ query: q, mode: args.mode, cwd });
    for (const e of enginesRun) engines.add(e);
    for (const w of warnings) allWarnings.push(`[${q}] ${w}`);
    for (const h of hits) rawHits.push({ ...h, query: q });
    perQuery.push({
      query: q,
      mode: effectiveMode,
      rawHitCount: hits.length
    });
  }

  let hits = dedupeHits(rawHits);
  hits = filterNoise(hits, args.includeNoisy);
  hits = hits.map((h) => ({ ...h, score: scoreHit(h, h.query || queries[0]) })).sort((a, b) => b.score - a.score);
  hits = hits.slice(0, Math.max(1, args.top));

  const result = {
    hits: hits
      .filter((h) => !(h.line == null && h.snippet === 'tracked-file'))
      .map((h) => ({
        path: h.path,
        line: h.line,
        snippet: h.snippet
      }))
  };

  if (args.graphJson) {
    const graph = { nodes: [], edges: [] };
    const importGraph = runCommandFallback(
      [
        { cmd: 'madge', args: ['--json', '--extensions', 'ts,tsx,js,mjs,cjs', 'packages', 'apps', 'libs', 'tools'] },
        { cmd: 'npx', args: ['--yes', 'madge', '--json', '--extensions', 'ts,tsx,js,mjs,cjs', 'packages', 'apps', 'libs', 'tools'] }
      ],
      cwd
    );
    if (importGraph.stdout) {
      const parsed = parseMadgeGraph(importGraph.stdout, cwd);
      graph.nodes.push(...parsed.nodes);
      graph.edges.push(...parsed.edges);
    }
    const storyGraph = parseStoryTopology(cwd);
    graph.nodes.push(...storyGraph.nodes);
    graph.edges.push(...storyGraph.edges);
    result.graph = {
      nodes: Array.from(new Set(graph.nodes)),
      edges: graph.edges
    };
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printText(result);
  }
}

main();
