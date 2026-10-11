import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
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
// Generated files that are copied verbatim instead of formatted.
const verbatim = new Set([pluginDir + '/LICENSE']);

/** @returns {Promise<Map<string, string>>} */
export async function generatedFiles() {
  const files = new Map();
  const identity = {
    name: catalog.name,
    version: catalog.version,
    description: catalog.description,
    author: { name: catalog.author },
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
            onboardingSkill: './skills/argus-setup/SKILL.md',
            interface: {
              displayName: 'Argus',
              shortDescription: catalog.description,
              developerName: catalog.author,
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
        JSON.stringify('Use $' + skill.name + ' for this Argus workflow.') +
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

/** @param {boolean} check */
export async function generate(check) {
  const files = await generatedFiles();
  const mismatches = [];
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
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await generate(process.argv.includes('--check'));
  process.stdout.write(
    'Generated resources ' + (process.argv.includes('--check') ? 'verified' : 'updated') + '\n',
  );
}
