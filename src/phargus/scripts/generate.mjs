import { readFile, writeFile, mkdir, readdir, rm, rmdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, sep } from 'node:path';
import prettier from 'prettier';

/** Sources and tooling live here; the shipped plugin and the marketplaces are at the repository root. */
export const root = fileURLToPath(new URL('../', import.meta.url));
export const repoRoot = join(root, '..', '..');
/** @typedef {{name: string, displayName: string, shortDescription: string, references: string[]}} Skill */
/** @type {{name: string, version: string, author: string, description: string, skills: Skill[]}} */
export const catalog = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8'));
/**
 * The plugin lives in its own directory. Codex ignores a marketplace whose plugin path is the
 * marketplace root, and copies only real files (not symlinks) into its plugin cache.
 */
export const pluginDir = 'plugins/' + catalog.name;
export const pluginPath = join(repoRoot, pluginDir);
/**
 * Publisher shared with the other plugins and the marketplaces in this repository. Set here, not
 * in catalog.json, because catalog.json is part of the behavioral-review fingerprint.
 */
export const author = { name: 'pharn-dev', url: 'https://github.com/pharn-dev' };
// Generated files that are copied verbatim instead of formatted.
const verbatim = new Set([pluginDir + '/LICENSE']);

/** @returns {Promise<Map<string, string>>} */
export async function generatedFiles() {
  const files = new Map();
  const identity = {
    name: catalog.name,
    version: catalog.version,
    description: catalog.description,
    author,
    homepage: 'https://github.com/pharn-dev/skills/tree/main/' + pluginDir,
    repository: 'https://github.com/pharn-dev/skills',
    license: 'Apache-2.0',
  };
  files.set(
    pluginDir + '/plugin.json',
    JSON.stringify(
      {
        $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
        ...identity,
        extensions: {
          'com.openai': {
            onboardingSkill: './skills/phargus-setup/SKILL.md',
            interface: {
              displayName: 'Phargus',
              shortDescription: catalog.description,
              developerName: author.name,
              category: 'Developer Tools',
            },
          },
        },
      },
      null,
      2,
    ),
  );
  files.set(pluginDir + '/.claude-plugin/plugin.json', JSON.stringify(identity, null, 2));
  files.set(pluginDir + '/LICENSE', await readFile(join(root, 'LICENSE'), 'utf8'));
  const runtime = (await readdir(join(root, 'runtime')))
    .filter((name) => name.endsWith('.mjs') || name.endsWith('.d.ts'))
    .sort();
  for (const skill of catalog.skills) {
    const prefix = pluginDir + '/skills/' + skill.name + '/';
    files.set(
      prefix + 'agents/openai.yaml',
      'interface:\n  display_name: ' +
        JSON.stringify(skill.displayName) +
        '\n  short_description: ' +
        JSON.stringify(skill.shortDescription) +
        '\n  default_prompt: ' +
        JSON.stringify('Use $' + skill.name + ' for this Phargus workflow.') +
        '\n',
    );
    for (const name of skill.references)
      files.set(
        prefix + 'references/' + name + '.md',
        await readFile(join(root, 'knowledge', name + '.md'), 'utf8'),
      );
    for (const name of runtime)
      files.set(prefix + 'scripts/' + name, await readFile(join(root, 'runtime', name), 'utf8'));
  }
  // Resolve from this repository explicitly so personal/parent configs cannot change bundles.
  const config = JSON.parse(await readFile(join(root, '.prettierrc.json'), 'utf8'));
  for (const [path, content] of files)
    if (!verbatim.has(path))
      files.set(path, await prettier.format(content, { ...config, filepath: path }));
  return files;
}

// Locations owned by the generator: every file in them must come from generatedFiles().
const ownedSkillDirectories = ['agents', 'scripts', 'references'];
const ownedPluginDirectories = ['.claude-plugin'];

/** @param {string} path @returns {Promise<string[]>} POSIX paths relative to path; [] if absent */
async function listFiles(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory())
      for (const file of await listFiles(join(path, entry.name)))
        files.push(entry.name + '/' + file);
    else files.push(entry.name);
  }
  return files;
}

/**
 * Find files in generator-owned locations that the generator no longer produces (for example a
 * removed runtime module or catalog reference), and skill directories missing from the catalog.
 * Hand-written SKILL.md files are never owned.
 * @param {Map<string, string>} files
 */
async function staleOutputs(files) {
  /** @type {string[]} */ const stale = [];
  /** @type {string[]} */ const uncatalogued = [];
  const catalogued = new Set(catalog.skills.map((skill) => skill.name));
  /** @param {string} relative */
  async function collect(relative) {
    for (const file of await listFiles(join(repoRoot, relative)))
      if (!files.has(relative + '/' + file)) stale.push(relative + '/' + file);
  }
  for (const directory of ownedPluginDirectories) await collect(pluginDir + '/' + directory);
  for (const entry of await readdir(join(pluginPath, 'skills'), { withFileTypes: true }).catch(
    () => [],
  )) {
    if (!entry.isDirectory()) continue;
    const skill = pluginDir + '/skills/' + entry.name;
    if (!catalogued.has(entry.name)) uncatalogued.push(skill + '/');
    else for (const directory of ownedSkillDirectories) await collect(skill + '/' + directory);
  }
  const order = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0);
  return { stale: stale.sort(order), uncatalogued: uncatalogued.sort(order) };
}

/** Remove directory and its empty ancestors up to (not including) stop. @param {string} directory @param {string} stop */
async function pruneEmpty(directory, stop) {
  while (directory.startsWith(stop + sep) && (await readdir(directory)).length === 0) {
    await rmdir(directory);
    directory = dirname(directory);
  }
}

/** @param {boolean} check */
export async function generate(check) {
  const files = await generatedFiles();
  const { stale, uncatalogued } = await staleOutputs(files);
  /** @type {string[]} */ const mismatches = [];
  if (check) mismatches.push(...stale.map((path) => path + ' (no longer generated)'));
  else
    for (const path of stale) {
      await rm(join(repoRoot, path));
      await pruneEmpty(dirname(join(repoRoot, path)), join(pluginPath, 'skills'));
    }
  for (const [path, content] of files) {
    const target = join(repoRoot, path);
    if (check) {
      let actual;
      try {
        actual = await readFile(target, 'utf8');
      } catch {
        actual = undefined;
      }
      if (actual !== content) mismatches.push(path);
    } else {
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, content);
    }
  }
  if (mismatches.length)
    throw new Error('Generated resources are stale; run npm run build: ' + mismatches.join(', '));
  // A skill directory without a catalog entry may hold hand-written work: report it, never delete.
  if (uncatalogued.length)
    throw new Error(
      'Skill directories missing from catalog.json; add them to catalog.json or remove them: ' +
        uncatalogued.join(', '),
    );
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await generate(process.argv.includes('--check'));
  process.stdout.write(
    'Generated resources ' + (process.argv.includes('--check') ? 'verified' : 'updated') + '\n',
  );
}
