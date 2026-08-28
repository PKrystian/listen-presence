import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const checksums = resolve(root, 'dist', 'release', 'SHA256SUMS.txt');
const signature = `${checksums}.asc`;
const keyId = process.env.LISTENPRESENCE_GPG_KEY_ID ?? '';

if (!/^[A-Fa-f0-9]{16,40}$/.test(keyId)) {
  throw new Error('LISTENPRESENCE_GPG_KEY_ID must be a 16 to 40 character GPG key ID.');
}

await rm(signature, { force: true });
await run(
  'gpg',
  [
    '--batch',
    '--yes',
    '--local-user',
    keyId,
    '--armor',
    '--detach-sign',
    '--output',
    signature,
    checksums,
  ],
  { cwd: root },
);
await run('gpg', ['--verify', signature, checksums], { cwd: root });
console.log(`Checksum signature written to ${signature}`);
