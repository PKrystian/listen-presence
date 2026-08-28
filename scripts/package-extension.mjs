import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const extensionDirectory = resolve(root, 'dist', 'extension');
const manifest = JSON.parse(await readFile(resolve(extensionDirectory, 'manifest.json'), 'utf8'));
const outputPath = resolve(
  root,
  'dist',
  'release',
  `listenpresence-extension-v${manifest.version}.zip`,
);

const releaseDirectory = dirname(outputPath);
await mkdir(releaseDirectory, { recursive: true });
const releaseEntries = await readdir(releaseDirectory);
await Promise.all(
  releaseEntries
    .filter((name) => /^listenpresence-extension-v\d+\.\d+\.\d+\.zip$/.test(name))
    .map((name) => rm(resolve(releaseDirectory, name), { force: true })),
);
await rm(outputPath, { force: true });

if (process.platform === 'win32') {
  await run(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "$ErrorActionPreference = 'Stop'; Compress-Archive -Path (Join-Path $env:LISTENPRESENCE_PACKAGE_SOURCE '*') -DestinationPath $env:LISTENPRESENCE_PACKAGE_OUTPUT -CompressionLevel Optimal -Force",
    ],
    {
      env: {
        ...process.env,
        LISTENPRESENCE_PACKAGE_SOURCE: extensionDirectory,
        LISTENPRESENCE_PACKAGE_OUTPUT: outputPath,
      },
    },
  );
} else {
  await run('zip', ['-q', '-r', outputPath, '.'], { cwd: extensionDirectory });
}

console.log(`Chrome Web Store package written to ${outputPath}`);
