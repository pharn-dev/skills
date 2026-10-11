import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contract, supportedNode, doctor } from '../runtime/upstream.mjs';

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

/** A real Node package resolution fixture; loading its agent would throw. @param {string} packageName */
async function application(packageName) {
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
      version: contract.packageVersion,
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
