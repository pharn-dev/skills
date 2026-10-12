import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, rm, readFile, writeFile, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, catalog, author, generate, pluginPath } from './generate.mjs';
import { evaluationGate } from './eval-gate.mjs';

const check = process.argv.includes('--check');
await generate(true);
const temporary = await mkdtemp(join(tmpdir(), catalog.name + '-package-'));
const dist = join(root, 'dist');
if (!check) await mkdir(dist, { recursive: true });
/** Archives written by this run; older versions left in dist/ are not part of this release. */
/** @type {string[]} */ const artifacts = [];
/** @param {string} path */
async function normalizeTimes(path) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) await normalizeTimes(target);
    await utimes(target, new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'));
  }
}
try {
  const plugin = join(temporary, catalog.name);
  await mkdir(plugin);
  // The plugin archive is the installable plugin directory plus release evidence.
  await cp(pluginPath, plugin, { recursive: true });
  for (const path of ['README.md', 'compatibility.json', 'VERIFICATION.md', 'VERIFICATION.json'])
    await cp(join(root, path), join(plugin, path));
  await cp(join(root, 'verification'), join(plugin, 'verification'), { recursive: true });
  const cli = join(plugin, 'skills', 'phargus-diagnose', 'scripts', 'phargus.mjs');
  const help = JSON.parse(
    execFileSync(process.execPath, [cli, '--help'], { cwd: temporary, encoding: 'utf8' }),
  );
  if (help.commands.length !== 7) throw new Error('copied plugin helper cannot run');
  if (!check) {
    await normalizeTimes(plugin);
    const name = catalog.name + '-' + catalog.version + '.zip';
    const target = join(dist, name);
    await rm(target, { force: true });
    execFileSync('zip', ['-q', '-X', '-r', target, '.'], { cwd: plugin });
    artifacts.push(name);
  }
  for (const skill of catalog.skills) {
    const copied = join(temporary, skill.name);
    await cp(join(pluginPath, 'skills', skill.name), copied, { recursive: true });
    await cp(join(root, 'LICENSE'), join(copied, 'LICENSE'));
    const output = JSON.parse(
      execFileSync(process.execPath, [join(copied, 'scripts', 'phargus.mjs'), '--help'], {
        cwd: temporary,
        encoding: 'utf8',
      }),
    );
    if (output.schemaVersion !== 1) throw new Error('standalone skill cannot run: ' + skill.name);
    if (!check) {
      await normalizeTimes(copied);
      const name = skill.name + '-' + catalog.version + '.zip';
      const target = join(dist, name);
      await rm(target, { force: true });
      execFileSync('zip', ['-q', '-X', '-r', target, '.'], { cwd: copied });
      artifacts.push(name);
    }
  }
  if (!check)
    await writeFile(
      join(dist, 'release.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          name: catalog.name,
          version: catalog.version,
          author,
          compatibility: JSON.parse(await readFile(join(root, 'compatibility.json'), 'utf8')),
          artifacts: artifacts.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
          behavioralGate: await evaluationGate(),
        },
        null,
        2,
      ) + '\n',
    );
  process.stdout.write(
    check
      ? 'Copied plugin and all five standalone packages verified\n'
      : 'Release artifacts written to dist/\n',
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
