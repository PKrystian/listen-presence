import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const releaseDirectory = resolve(root, 'dist', 'release');
const checksumName = 'SHA256SUMS.txt';
const packageData = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const files = [
  'ListenPresence-Setup.exe',
  `listenpresence-extension-v${packageData.version}.zip`,
  'listenpresence-darwin-amd64.zip',
  'listenpresence-darwin-arm64.zip',
  'listenpresence-linux-amd64.tar.gz',
  'listenpresence-linux-arm64.tar.gz',
].sort();

const lines = [];
for (const filename of files) {
  const contents = await readFile(resolve(releaseDirectory, filename));
  const digest = createHash('sha256').update(contents).digest('hex');
  lines.push(`${digest}  ${filename}`);
}
await writeFile(resolve(releaseDirectory, checksumName), `${lines.join('\n')}\n`, 'utf8');
await rm(resolve(releaseDirectory, `${checksumName}.asc`), { force: true });
console.log(`Release checksums written to ${resolve(releaseDirectory, checksumName)}`);
