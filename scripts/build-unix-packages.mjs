import { execFile } from 'node:child_process';
import { chmod, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const releaseDirectory = resolve(root, 'dist', 'release');
const extensionId = process.env.LISTENPRESENCE_EXTENSION_ID ?? '';
const applicationId = process.env.LISTENPRESENCE_DISCORD_APPLICATION_ID ?? '';
const allTargets = [
  ['darwin', 'amd64'],
  ['darwin', 'arm64'],
  ['linux', 'amd64'],
  ['linux', 'arm64'],
];
const platformArgumentIndex = process.argv.indexOf('--platform');
const selectedPlatform =
  platformArgumentIndex === -1 ? '' : (process.argv[platformArgumentIndex + 1] ?? '');
if (selectedPlatform !== '' && selectedPlatform !== 'darwin' && selectedPlatform !== 'linux') {
  throw new Error('--platform must be darwin or linux.');
}
const targets = selectedPlatform
  ? allTargets.filter(([platform]) => platform === selectedPlatform)
  : allTargets;

if (!/^[a-p]{32}$/.test(extensionId)) {
  throw new Error('LISTENPRESENCE_EXTENSION_ID must be a 32-character published extension ID.');
}
if (!/^\d{17,20}$/.test(applicationId)) {
  throw new Error('LISTENPRESENCE_DISCORD_APPLICATION_ID must be a Discord application ID.');
}

await mkdir(releaseDirectory, { recursive: true });
for (const [platform, architecture] of targets) {
  const packageName = `listenpresence-${platform}-${architecture}`;
  const packageDirectory = resolve(releaseDirectory, packageName);
  const archiveExtension = platform === 'darwin' ? '.zip' : '.tar.gz';
  const archivePath = resolve(releaseDirectory, `${packageName}${archiveExtension}`);
  const connectorSource = resolve(
    root,
    'dist',
    'native-host',
    `listenpresence-connector-${platform}-${architecture}`,
  );
  await rm(packageDirectory, { recursive: true, force: true });
  await mkdir(packageDirectory, { recursive: true });
  await copyFile(connectorSource, resolve(packageDirectory, 'listenpresence-connector'));
  await copyFile(
    resolve(root, 'installer', 'unix', 'install.sh'),
    resolve(packageDirectory, 'install.sh'),
  );
  await copyFile(
    resolve(root, 'installer', 'unix', 'uninstall.sh'),
    resolve(packageDirectory, 'uninstall.sh'),
  );
  for (const notice of ['LICENSE', 'COPYRIGHT.md', 'THIRD_PARTY_NOTICES.md']) {
    await copyFile(resolve(root, notice), resolve(packageDirectory, basename(notice)));
  }
  await writeFile(resolve(packageDirectory, '.listenpresence-extension-id'), `${extensionId}\n`);
  await writeFile(
    resolve(packageDirectory, '.listenpresence-discord-application-id'),
    `${applicationId}\n`,
  );
  await chmod(resolve(packageDirectory, 'listenpresence-connector'), 0o755);
  await chmod(resolve(packageDirectory, 'install.sh'), 0o755);
  await chmod(resolve(packageDirectory, 'uninstall.sh'), 0o755);
  await Promise.all(
    ['.zip', '.tar.gz'].map((extension) =>
      rm(resolve(releaseDirectory, `${packageName}${extension}`), { force: true }),
    ),
  );
  if (platform === 'darwin' && process.platform === 'darwin') {
    await run('ditto', ['-c', '-k', '--sequesterRsrc', packageDirectory, archivePath], {
      cwd: root,
    });
  } else if (platform === 'darwin') {
    await run('tar', ['-a', '-cf', archivePath, '-C', packageDirectory, '.'], { cwd: root });
  } else {
    await run('tar', ['-czf', archivePath, '-C', packageDirectory, '.'], { cwd: root });
  }
  console.log(`Release package written to ${archivePath}`);
}
