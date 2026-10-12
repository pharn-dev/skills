import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, symlink, rm, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { root, repoRoot } from './generate.mjs';

const { values } = parseArgs({
  options: { source: { type: 'string' }, 'reuse-dependencies': { type: 'boolean' } },
});
// Default: a Phargus checkout next to this repository.
const source = resolve(values.source ?? join(repoRoot, '..', 'phargus'));
const pinned = JSON.parse(await readFile(join(root, 'compatibility.json'), 'utf8'));
// A repository rename does not change old commits. Reject a predecessor package before
// building or creating a misleading integration manifest for the renamed contract.
const sourcePackage = JSON.parse(
  execFileSync('git', ['show', pinned.commit + ':package.json'], {
    cwd: source,
    encoding: 'utf8',
  }),
);
if (sourcePackage.name !== pinned.packageName || sourcePackage.version !== pinned.packageVersion)
  throw new Error(
    'Pinned upstream ' +
      pinned.commit +
      ' contains ' +
      sourcePackage.name +
      '@' +
      sourcePackage.version +
      '; expected ' +
      pinned.packageName +
      '@' +
      pinned.packageVersion +
      '. Update the pinned contract in compatibility.json, runtime/upstream.mjs and ci.yml before integration or model trials.',
  );
if (pinned.published === true && sourcePackage.private === true)
  throw new Error(
    'Pinned upstream ' +
      pinned.commit +
      ' marks its package private; compatibility.json says it is published.',
  );
// The documented source fallback clones the release tag, so the pinned commit must be the
// tag's commit. CI fetches the commit by SHA without tags; a checkout with the tag must agree.
let taggedCommit;
try {
  taggedCommit = execFileSync(
    'git',
    ['rev-parse', '--verify', '--quiet', 'refs/tags/' + pinned.tag + '^{commit}'],
    { cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();
} catch {
  taggedCommit = undefined;
}
if (taggedCommit !== undefined && taggedCommit !== pinned.commit)
  throw new Error(
    'Tag ' + pinned.tag + ' in ' + source + ' is ' + taggedCommit + '; expected ' + pinned.commit,
  );
const cache = join(root, '.cache');
const npmEnv = { ...process.env, npm_config_cache: join(cache, 'npm') };
const build = join(cache, 'phargus-build-' + process.versions.node);
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
  JSON.stringify({ name: 'phargus-integration-app', private: true, version: '1.0.0' }, null, 2) +
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
  tag: pinned.tag,
  tagVerified: taggedCommit !== undefined,
  nodeVersion: process.versions.node,
  tarballSha256: createHash('sha256')
    .update(await readFile(tarball))
    .digest('hex'),
  reusedDependencies: values['reuse-dependencies'] ?? false,
};
await writeFile(join(cache, 'integration.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
