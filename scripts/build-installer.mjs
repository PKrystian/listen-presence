import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const extensionId = process.env.LISTENPRESENCE_EXTENSION_ID ?? '';
const applicationId = process.env.LISTENPRESENCE_DISCORD_APPLICATION_ID ?? '';
const connectorPath = resolve(root, 'dist', 'native-host', 'listenpresence-connector.exe');
const generatedAssetPath = resolve(
  root,
  'installer',
  'windows',
  'cmd',
  'listenpresence-installer',
  'connector_asset_release.go',
);
const outputPath = resolve(root, 'dist', 'release', 'ListenPresence-Setup.exe');

if (!/^[a-p]{32}$/.test(extensionId)) {
  throw new Error('LISTENPRESENCE_EXTENSION_ID must be a 32-character published extension ID.');
}
if (!/^\d{17,20}$/.test(applicationId)) {
  throw new Error('LISTENPRESENCE_DISCORD_APPLICATION_ID must be a Discord application ID.');
}

const connector = await readFile(connectorPath);
const bytes = Array.from(connector, (value) => value.toString(10)).join(',');
const generatedSource = `//go:build release

package main

var connectorAsset = []byte{${bytes}}
`;
await writeFile(generatedAssetPath, generatedSource, 'utf8');
await mkdir(dirname(outputPath), { recursive: true });

await run(
  'go',
  [
    '-C',
    'installer/windows',
    'build',
    '-tags',
    'release',
    '-buildvcs=false',
    '-trimpath',
    '-ldflags',
    `-H=windowsgui -s -w -X main.publishedExtensionID=${extensionId} -X main.discordApplicationID=${applicationId}`,
    '-o',
    outputPath,
    './cmd/listenpresence-installer',
  ],
  { cwd: root },
);

console.log(`Installer build written to ${outputPath}`);
