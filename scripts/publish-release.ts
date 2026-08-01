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

if (token.includes('github_pat_key') || token === 'ghp_or_github_pat_here') {
  console.error('ERROR: Replace the placeholder GITHUB_DEPLOY_KEY in .env with a real token.');
  process.exit(1);
}

// electron-builder reads GH_TOKEN for GitHub publishing
process.env.GH_TOKEN = token;
// Skip code-signing discovery noise on unsigned builds
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= 'false';

console.log('[publish] Using GITHUB_DEPLOY_KEY for GitHub Releases on HitarthSM/ERP-Client.');
console.log('[publish] Building Windows NSIS only (no Snap Store).');
console.log('[publish] Starting full build + publish pipeline…\n');

// --win: Windows installer only. Without this, Linux hosts build .snap and try Snap Store.
execSync('npm run build && electron-builder --win --x64 --publish always', {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
