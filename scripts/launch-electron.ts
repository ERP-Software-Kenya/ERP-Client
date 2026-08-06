import { spawn } from 'child_process';
import { createRequire } from 'module';

// Unset ELECTRON_RUN_AS_NODE so Electron starts in window mode, not Node-only mode.
delete process.env.ELECTRON_RUN_AS_NODE;

const require = createRequire(import.meta.url);
const electronPath = require('electron') as string;
const args = process.argv.slice(2);
if (process.platform === 'linux') {
  args.push('--ozone-platform=x11');
}

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code: number | null) => process.exit(code ?? 0));
