import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const phargusDirectory = fileURLToPath(new URL('..', import.meta.url));

/** @param {string} text */
function flatten(text) {
  return text.replace(/\s+/g, ' ');
}

test('AC-8: data.md and tools.md name the route cap, (other), routesFolded and the lower bound', async () => {
  for (const name of ['data.md', 'tools.md']) {
    const text = flatten(await readFile(new URL('../knowledge/' + name, import.meta.url), 'utf8'));
    for (const phrase of ['10,000', '(other)', 'routesFolded', 'distinctRoutes is a lower bound'])
      assert(text.includes(phrase), name + ' must name ' + phrase);
  }
  const generated = spawnSync('npm', ['run', 'check:generated'], {
    cwd: phargusDirectory,
    encoding: 'utf8',
    timeout: 300_000,
  });
  assert.equal(
    generated.status,
    0,
    'npm run check:generated: ' + (generated.stdout ?? '') + (generated.stderr ?? ''),
  );
});

test('AC-9: the Unreleased Fixed section has a phargus 0.1.1 bullet for the route cap', async () => {
  const changelog = await readFile(new URL('../../../CHANGELOG.md', import.meta.url), 'utf8');
  const unreleasedStart = changelog.indexOf('## [Unreleased]');
  assert(unreleasedStart >= 0, 'CHANGELOG.md must have an [Unreleased] section');
  const afterHeading = unreleasedStart + '## [Unreleased]'.length;
  const nextRelease = changelog.indexOf('\n## [', afterHeading);
  const unreleased = changelog.slice(afterHeading, nextRelease < 0 ? undefined : nextRelease);
  const fixedStart = unreleased.indexOf('\n### Fixed');
  assert(fixedStart >= 0, '[Unreleased] must have a ### Fixed subsection');
  const fixedBody = unreleased.slice(fixedStart + '\n### Fixed'.length);
  const nextSubsection = fixedBody.indexOf('\n### ');
  const fixed = nextSubsection < 0 ? fixedBody : fixedBody.slice(0, nextSubsection);
  const bullets = fixed
    .split(/\n(?=- )/)
    .map((bullet) => flatten(bullet.trim()))
    .filter((bullet) => bullet.startsWith('- '));
  const matching = bullets.filter(
    (bullet) =>
      bullet.startsWith('- `phargus` 0.1.1:') &&
      ['summarize', 'compare', '10,000', 'routesFolded'].every((word) => bullet.includes(word)),
  );
  assert(matching.length >= 1, 'a phargus 0.1.1 bullet must name the route cap');
});
