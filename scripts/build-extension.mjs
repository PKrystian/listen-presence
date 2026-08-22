import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist', 'extension');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(resolve(output, 'popup'), { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: {
    'content/content-script': resolve(root, 'extension', 'src', 'content', 'content-script.ts'),
    'background/service-worker': resolve(
      root,
      'extension',
      'src',
      'background',
      'service-worker.ts',
    ),
    'popup/popup': resolve(root, 'extension', 'src', 'popup', 'popup.ts'),
  },
  bundle: true,
  format: 'iife',
  outdir: output,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  logLevel: 'info',
});

await cp(resolve(root, 'extension', 'public'), output, { recursive: true });
await cp(
  resolve(root, 'extension', 'src', 'popup', 'popup.html'),
  resolve(output, 'popup', 'popup.html'),
);

console.log(`Extension build written to ${output}`);
