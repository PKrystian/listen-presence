import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(root, 'dist', 'native-host');
const platformNames = { win32: 'windows', darwin: 'darwin', linux: 'linux' };
const architectureNames = { x64: 'amd64', arm64: 'arm64' };
const releaseTargets = [
  ['windows', 'amd64'],
  ['darwin', 'amd64'],
  ['darwin', 'arm64'],
  ['linux', 'amd64'],
  ['linux', 'arm64'],
];

const currentPlatform = platformNames[process.platform];
const currentArchitecture = architectureNames[process.arch];
if (!currentPlatform || !currentArchitecture) {
  throw new Error(`Unsupported build platform: ${process.platform}/${process.arch}`);
}

const buildAll = process.argv.includes('--all');
const targets = buildAll ? releaseTargets : [[currentPlatform, currentArchitecture]];
await mkdir(outputDirectory, { recursive: true });

for (const [goos, goarch] of targets) {
  const extension = goos === 'windows' ? '.exe' : '';
  const filename = buildAll
    ? `listenpresence-connector-${goos}-${goarch}${extension}`
    : `listenpresence-connector${extension}`;
  const outputPath = resolve(outputDirectory, filename);
  await run(
    'go',
    [
      '-C',
      'native-host',
      'build',
      '-buildvcs=false',
      '-trimpath',
      '-ldflags=-s -w',
      '-o',
      outputPath,
      './cmd/listenpresence-connector',
    ],
    {
      cwd: root,
      env: { ...process.env, GOOS: goos, GOARCH: goarch, CGO_ENABLED: '0' },
    },
  );
  console.log(`Native connector build written to ${outputPath}`);
}
