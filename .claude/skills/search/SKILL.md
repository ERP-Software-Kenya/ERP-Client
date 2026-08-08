---
name: search
description: "Run multi-lane spotlight search over this repo (text, structural, symbol, semantic, architecture, hygiene) and optionally emit graph topology including story edges discovered from workflow config."
---

# Search Skill: Spotlight Search

Use this skill to run a single-command, OSS-only, multi-lane repository search that merges and deduplicates results.

## What this skill runs

This skill uses `spotlight-search.mjs` in the same folder:

- `.claude/skills/search/spotlight-search.mjs`

It runs multiple search lanes and merges matches into one result object:

- exact text search (`rg`)
- structural search (`ast-grep`)
- symbol/index search (`ast-index`)
- semantic sentence search (`grepmax` / `gmax`)
- architecture cycle signals (`madge`)
- hygiene scan for tracked artifact patterns

## Output contract

Default output is intentionally compact and only includes:

- `hits[]`
  - `path`
  - `line`
  - `snippet`

No engine names, scores, telemetry, or summary metadata are returned.

Optional topology output:

- add `--graph-json` to include `graph` with:
  - `nodes[]` (repo-relative paths)
  - `edges[]` typed edges:
    - `file_import` (from `madge --json`)
    - `story_file` (from story files discovered via `workflow/workflow.config.json` root `storiesDir` + optional `stories.surfaces[]`, using `files[].path` entries)
    - `story_story` (from `dependsOnDone` story references)

## Primary commands

Single query:

- `node .claude/skills/search/spotlight-search.mjs "your sentence query" --mode all --top 20 --json`
- `node .claude/skills/search/spotlight-search.mjs "your sentence query" --mode all --top 20 --json --graph-json`

Batch queries from JSON array:

- `node .claude/skills/search/spotlight-search.mjs --queries-json '["q1","q2"]' --mode all --top 40 --json`
- `node .claude/skills/search/spotlight-search.mjs --queries-json '["where is architecture graph generated and verified","which workflow stories define spotlight search acceptance criteria","find tracked generated artifacts that should not be committed"]' --mode all --top 40 --json`

Batch queries from file:

- `node .claude/skills/search/spotlight-search.mjs --query-file /absolute/path/to/queries.json --mode all --top 40 --json`

Plain text output:

- `node .claude/skills/search/spotlight-search.mjs "your query" --mode all --top 20 --text`

## Query guidance

Use natural-language sentence queries for semantic retrieval, then inspect returned files:

- "where is architecture graph generated and verified"
- "find workflow stories that define acceptance criteria for spotlight search"
- "show places that track generated artifacts in git"

## Modes

Supported modes:

- `auto`
- `all` (recommended default)
- `exact`
- `ast`
- `symbol`
- `hygiene`
- `arch`

Use `all` for full spotlight behavior.

## Requirements

Expected tools available on PATH or through `npx` fallback:

- `rg`
- `sg` (`ast-grep`)
- `pnpm` with `ast-index` available in project context
- `grepmax` / `gmax` (or `npx grepmax`)
- `madge` (or `npx madge`)

## Notes

- Script deduplicates overlapping hits across engines before returning.
- Synthetic hygiene placeholders are filtered from final output.
- `line` may be `null` for file-level architecture-cycle hits.
