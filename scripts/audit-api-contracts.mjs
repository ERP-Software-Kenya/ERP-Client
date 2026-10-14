import fs from 'node:fs';
import path from 'node:path';

const clientRoot = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(clientRoot, '..', 'core-apis', 'src');

function walk(root, predicate) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath, predicate));
    else if (predicate(fullPath)) files.push(fullPath);
  }
  return files;
}

function normalizeRoute(route) {
  return route
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/:[A-Za-z0-9_]+/g, ':param')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '') || '/';
}

function routeMatches(clientRoute, backendRoute) {
  const clientSegments = normalizeRoute(clientRoute).split('/');
  const backendSegments = normalizeRoute(backendRoute).split('/');
  return clientSegments.length === backendSegments.length && clientSegments.every(
    (segment, index) => segment === ':param' || backendSegments[index] === ':param' || segment === backendSegments[index],
  );
}

const clientCalls = [];
for (const file of walk(path.join(clientRoot, 'renderer', 'src'), (name) => /\.(ts|tsx)$/.test(name))) {
  const source = fs.readFileSync(file, 'utf8');
  const callPattern = /\b(get|post|put|patch|del|getBlob|uploadForm)(?:<[^;\n]*?>)?\s*\(\s*([`'"])(\/api\/v1\/[^`'"]+)\2/g;
  for (const match of source.matchAll(callPattern)) {
    clientCalls.push({
      method: ({ del: 'DELETE', getBlob: 'GET', uploadForm: 'POST' })[match[1]] ?? match[1].toUpperCase(),
      route: normalizeRoute(match[3]),
      file: path.relative(clientRoot, file),
    });
  }
}

const backendRoutes = [];
for (const file of walk(backendRoot, (name) => name.endsWith('.controller.ts'))) {
  const source = fs.readFileSync(file, 'utf8');
  const controller = source.match(/@Controller\(\{[\s\S]*?path:\s*['"]([^'"]+)['"][\s\S]*?version:\s*['"]([^'"]+)['"][\s\S]*?\}\)/);
  if (!controller) continue;
  const [, base, version] = controller;
  const routePattern = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"]([^'"]*)['"])?\s*\)/g;
  for (const match of source.matchAll(routePattern)) {
    const suffix = match[2] ? `/${match[2]}` : '';
    backendRoutes.push({ method: match[1].toUpperCase(), route: normalizeRoute(`/api/v${version}/${base}${suffix}`) });
  }
}

const uniqueCalls = [...new Map(clientCalls.map((call) => [`${call.method} ${call.route}`, call])).values()];
const unmatched = uniqueCalls.filter((call) => !backendRoutes.some(
  (route) => route.method === call.method && routeMatches(call.route, route.route),
));

console.log(JSON.stringify({
  clientCalls: uniqueCalls.length,
  backendRoutes: backendRoutes.length,
  unmatched,
}, null, 2));

if (unmatched.length > 0) process.exitCode = 1;
