import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

// Load .env manually — dotenv is a prod dep but this runs before build
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

const token = process.env.GITHUB_DEPLOY_KEY;
if (!token) {
  console.error('ERROR: GITHUB_DEPLOY_KEY not found in .env — cannot publish.');
  process.exit(1);
}

// electron-builder reads GH_TOKEN for GitHub publishing
process.env.GH_TOKEN = token;

console.log('[publish] Using GITHUB_DEPLOY_KEY for release publishing.');
console.log('[publish] Starting full build + publish pipeline…\n');

execSync(
  'npm run build && electron-builder --publish always',
  { stdio: 'inherit', cwd: root },
);
