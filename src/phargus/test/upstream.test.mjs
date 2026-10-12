import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contract,
  acceptedPackageRange,
  supportedNode,
  supportedPackageVersion,
  doctor,
  resolvePhargus,
} from '../runtime/upstream.mjs';

test('supportedNode accepts exactly the contract minimum Node and newer', () => {
  assert.equal(contract.minimumNode, '22.18.0');
  assert.equal(supportedNode('22.18.0'), true);
  assert.equal(supportedNode('22.18.1'), true);
  assert.equal(supportedNode('22.19.0'), true);
  assert.equal(supportedNode('23.0.0'), true);
  assert.equal(supportedNode('24.1.0'), true);
  assert.equal(supportedNode('22.17.9'), false);
  assert.equal(supportedNode('22.0.99'), false);
  assert.equal(supportedNode('21.99.0'), false);
  assert.equal(supportedNode('18.20.4'), false);
});

test('supportedPackageVersion accepts the tested minor and rejects others', () => {
  assert.equal(contract.packageVersion, '0.1.0');
  assert.equal(acceptedPackageRange, '>=0.1.0 <0.2.0');
  for (const version of ['0.1.0', '0.1.1', '0.1.5', '0.1.42'])
    assert.equal(supportedPackageVersion(version), true, version);
  for (const version of [
    '0.0.1',
    '0.0.99',
    '0.2.0',
    '0.10.0',
    '1.0.0',
    '0.1.1-beta.1',
    '0.1.0-rc.1',
    '0.1.0+build.5',
    '0.0.0-stage',
    'v0.1.0',
    '0.1',
    '0.01.0',
    ' 0.1.0',
    'latest',
    '',
    undefined,
    null,
    10,
    ['0.1.0'],
  ])
    assert.equal(supportedPackageVersion(version), false, String(version));
});

/** A real Node package resolution fixture; loading its agent would throw. @param {string} packageName @param {unknown} [version] */
async function application(packageName, version = contract.packageVersion) {
  const project = await mkdtemp(join(tmpdir(), 'phargus-resolution-'));
  const packageRoot = join(project, 'node_modules', packageName);
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(project, 'package.json'),
    JSON.stringify({ scripts: { start: 'node app.cjs' } }),
  );
  await writeFile(
    join(packageRoot, 'agent.cjs'),
    'throw new Error("agent must not be loaded by doctor");\n',
  );
  const exports = Object.fromEntries(
    ['agent', 'collector', 'analyzer', 'dashboard', 'plugin-runner', 'otel'].map((name) => [
      './' + name,
      './agent.cjs',
    ]),
  );
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      name: packageName,
      version,
      exports: { ...exports, './package.json': './package.json' },
    }),
  );
  await writeFile(
    join(project, 'phargus.config.json'),
    JSON.stringify({ intervalMs: 250, enabled: true, output: 'none', unrelated: 'omit this' }),
  );
  return project;
}

test('doctor resolves the scoped Phargus package and renamed config without loading the agent', async () => {
  const project = await application('@pharn-dev/phargus');
  try {
    const result = await doctor(project);
    assert.equal(result.package.name, '@pharn-dev/phargus');
    assert.equal(result.package.sourceCommitVerified, false);
    assert.deepEqual(result.config, { output: 'none', intervalMs: 250, enabled: true });
    assert.equal(Object.keys(result.exports).length, 6);
    assert.deepEqual(result.application.scriptNames, ['start']);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('the renamed CLI accepts --phargus-package for an installed package alias', async () => {
  const project = await application('@fixture/diagnostics');
  try {
    const cli = fileURLToPath(new URL('../runtime/phargus.mjs', import.meta.url));
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, 'doctor', '--project', project, '--phargus-package', '@fixture/diagnostics'],
        { encoding: 'utf8' },
      ),
    );
    assert.equal(result.package.name, '@fixture/diagnostics');
    assert.equal(result.config.intervalMs, 250);
    const metadata = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
    assert.deepEqual(metadata.scripts, { start: 'node app.cjs' });
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('resolvePhargus accepts published 0.1.x patch releases', async () => {
  for (const version of ['0.1.0', '0.1.5']) {
    const project = await application('@pharn-dev/phargus', version);
    try {
      const result = await doctor(project);
      assert.equal(result.package.version, version);
      assert.equal(result.package.testedVersion, '0.1.0');
      assert.equal(result.package.acceptedRange, '>=0.1.0 <0.2.0');
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  }
});

test('resolvePhargus rejects versions outside the accepted range with the range in the error', async () => {
  for (const version of ['0.0.1', '0.2.0', '0.1.1-beta.1', 'not-a-version', null]) {
    const project = await application('@pharn-dev/phargus', version);
    try {
      await assert.rejects(resolvePhargus(project), (error) => {
        assert(error instanceof Error);
        assert.match(error.message, /expected a version in >=0\.1\.0 <0\.2\.0/);
        return true;
      });
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  }
});

test('a missing package names the npm install command and accepted range', async () => {
  const project = await mkdtemp(join(tmpdir(), 'phargus-missing-'));
  try {
    await writeFile(join(project, 'package.json'), '{}');
    await assert.rejects(
      resolvePhargus(project),
      /npm install @pharn-dev\/phargus@0\.1\.0 \(helpers accept >=0\.1\.0 <0\.2\.0\)/,
    );
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});
