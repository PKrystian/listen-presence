import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageData = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const lockData = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const manifest = JSON.parse(
  await readFile(resolve(root, 'extension', 'public', 'manifest.json'), 'utf8'),
);
const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
const version = packageData.version;

const versions = [lockData.version, lockData.packages?.['']?.version, manifest.version];
if (!/^\d+\.\d+\.\d+$/.test(version) || versions.some((candidate) => candidate !== version)) {
  throw new Error('package.json, package-lock.json, and manifest.json versions must match.');
}
if (!changelog.includes(`## [${version}] - `)) {
  throw new Error(`CHANGELOG.md has no release entry for ${version}.`);
}

console.log(`Release version ${version} is consistent.`);
