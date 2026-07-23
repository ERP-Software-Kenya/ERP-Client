import esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';

const isWatch = process.argv.includes('--watch');

const outdir = 'dist/main';
if (!existsSync(outdir)) {
  mkdirSync(outdir, { recursive: true });
}

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ['src/main/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  outdir,
  outExtension: { '.js': '.cjs' },
  sourcemap: true,
  external: ['electron'],
  format: 'cjs',
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[esbuild] Watching main process files...');
} else {
  await esbuild.build(buildOptions);
  console.log('[esbuild] Main process built successfully.');
}
