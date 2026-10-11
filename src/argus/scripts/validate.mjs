import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { readFile, access, readdir, lstat } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { catalog, root, repoRoot, generate, pluginDir, pluginPath } from './generate.mjs';

await generate(true);
for (const skill of catalog.skills) {
  const directory = join(pluginPath, 'skills', skill.name);
  const content = await readFile(join(directory, 'SKILL.md'), 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  assert(match, 'missing frontmatter: ' + skill.name);
  const metadata = parse(match[1]);
  assert.equal(metadata.name, skill.name);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name));
  assert(typeof metadata.description === 'string' && metadata.description.length <= 1024);
  assert(!/\$\{CLAUDE_|TODO|\[insert/i.test(content), 'nonportable syntax or unfinished skill');
  assert(content.split('\n').length < 500);
  for (const link of content.matchAll(/\]\(([^)]+)\)/g)) {
    if (!link[1].includes('://')) await access(join(directory, link[1]));
  }
  assert.equal(metadata.license, 'Apache-2.0');
  const ui = parse(await readFile(join(directory, 'agents/openai.yaml'), 'utf8'));
  assert(ui.interface.default_prompt.includes('$' + skill.name));
}
// Codex drops a marketplace whose plugin path is the marketplace root, and its plugin cache
// keeps no symlinks. Both marketplaces must point at a real plugin subdirectory.
/** @param {string} path */
async function assertNoSymlinks(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    assert(!(await lstat(target)).isSymbolicLink(), 'symlink in plugin directory: ' + target);
    if (entry.isDirectory()) await assertNoSymlinks(target);
  }
}
// The marketplaces are shared with the repository's other plugins and maintained by hand.
const claudeMarket = JSON.parse(
  await readFile(join(repoRoot, '.claude-plugin/marketplace.json'), 'utf8'),
);
const codexMarket = JSON.parse(
  await readFile(join(repoRoot, '.agents/plugins/marketplace.json'), 'utf8'),
);
/** @param {{plugins: {name: string, version?: string, source: any}[]}} market */
function entry(market) {
  const found = market.plugins.find((plugin) => plugin.name === catalog.name);
  assert(found, 'marketplace has no ' + catalog.name + ' entry');
  assert(found.version === undefined || found.version === catalog.version, 'marketplace version');
  return found;
}
for (const source of [entry(claudeMarket).source, entry(codexMarket).source.path]) {
  const relative = normalize(source);
  assert(
    relative !== '.' && relative !== '' && !relative.startsWith('..'),
    'plugin path ' + source,
  );
  assert.equal(relative, normalize(pluginDir));
}
for (const manifest of ['plugin.json', '.claude-plugin/plugin.json', 'LICENSE'])
  await access(join(pluginPath, manifest));
await assertNoSymlinks(pluginPath);
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, catalog.version);
assert.equal(pkg.private, true);
assert.equal(pkg.dependencies, undefined);
assert.equal((await readFile(join(root, '.nvmrc'), 'utf8')).trim(), '22.18.0');
assert(
  (await readFile(join(root, 'LICENSE'), 'utf8')).startsWith('Copyright 2026 Przemek Galarowicz'),
);
process.stdout.write('Validated all five portable skills and plugin metadata\n');
