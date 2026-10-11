import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, symlink, rm, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { root, repoRoot } from './generate.mjs';

const { values } = parseArgs({
  options: { source: { type: 'string' }, 'reuse-dependencies': { type: 'boolean' } },
});
// Default: an Argus checkout next to this repository.
const source = resolve(values.source ?? join(repoRoot, '..', 'argus'));
const pinned = JSON.parse(await readFile(join(root, 'compatibility.json'), 'utf8'));
const cache = join(root, '.cache');
const npmEnv = { ...process.env, npm_config_cache: join(cache, 'npm') };
const build = join(cache, 'argus-build-' + process.versions.node);
const project = join(cache, 'application-' + process.versions.node);
await mkdir(cache, { recursive: true });
// Only remove this tool's ignored scratch directories, never the provided source.
await rm(build, { recursive: true, force: true });
await rm(project, { recursive: true, force: true });
await mkdir(build);
await mkdir(project);
const archive = execFileSync('git', ['archive', '--format=tar', pinned.commit], {
  cwd: source,
  maxBuffer: 64 * 1024 * 1024,
});
execFileSync('tar', ['-x', '-C', build], { input: archive });
if (values['reuse-dependencies']) {
  await access(join(source, 'node_modules'));
  await symlink(join(source, 'node_modules'), join(build, 'node_modules'), 'dir');
} else
  execFileSync('npm', ['ci', '--no-audit', '--no-fund'], {
    cwd: build,
    stdio: 'inherit',
    env: npmEnv,
  });
execFileSync('npm', ['run', 'build'], { cwd: build, stdio: 'inherit', env: npmEnv });
const packed = JSON.parse(
  execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', cache], {
    cwd: build,
    encoding: 'utf8',
    env: npmEnv,
  }),
);
const tarball = join(cache, packed[0].filename);
await writeFile(
  join(project, 'package.json'),
  JSON.stringify({ name: 'argus-integration-app', private: true, version: '1.0.0' }, null, 2) +
    '\n',
);
execFileSync(
  'npm',
  [
    'install',
    tarball,
    '--legacy-peer-deps',
    '--omit=optional',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ],
  { cwd: project, stdio: 'inherit', env: npmEnv },
);
if (values['reuse-dependencies']) {
  const peer = join(source, 'node_modules', 'isolated-vm');
  await access(peer);
  await symlink(peer, join(project, 'node_modules', 'isolated-vm'), 'dir');
} else
  execFileSync('npm', ['install', 'isolated-vm@^6.1.0', '--no-audit', '--no-fund'], {
    cwd: project,
    stdio: 'inherit',
    env: npmEnv,
  });
const manifest = {
  schemaVersion: 1,
  project,
  tarball,
  commit: pinned.commit,
  nodeVersion: process.versions.node,
  tarballSha256: createHash('sha256')
    .update(await readFile(tarball))
    .digest('hex'),
  reusedDependencies: values['reuse-dependencies'] ?? false,
};
await writeFile(join(cache, 'integration.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
