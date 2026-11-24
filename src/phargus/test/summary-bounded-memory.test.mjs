import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sample, span } from './fixtures.mjs';

// The CLI runs from src/phargus whatever directory the test runner was started in.
const phargusDirectory = fileURLToPath(new URL('..', import.meta.url));
const SPANS = 200_000;
const CHUNK = 10_000;

/** @type {string} */
let directory;
/** @type {string} */
let recording;

/**
 * 61 one-second samples make the runtime period [0, 61000). Each of the 200,000 spans has a unique
 * path and lies fully inside that period. The file (about 50 MB) is written in chunks.
 * @param {string} file
 */
async function writeRecording(file) {
  const handle = await open(file, 'w');
  try {
    let lines = [];
    for (let i = 0; i <= 60; i += 1)
      lines.push(JSON.stringify({ event: 'sample', data: sample(i * 1000) }));
    await handle.write(lines.join('\n') + '\n');
    lines = [];
    for (let i = 0; i < SPANS; i += 1) {
      const path = '/users/' + i + '/orders';
      const data = {
        ...span(1000 + (i % 58_000), 1_000_000),
        spanId: i.toString(16).padStart(16, '0'),
        name: 'GET ' + path,
        path,
      };
      lines.push(JSON.stringify({ event: 'span', data }));
      if (lines.length === CHUNK) {
        await handle.write(lines.join('\n') + '\n');
        lines = [];
      }
    }
    if (lines.length > 0) await handle.write(lines.join('\n') + '\n');
  } finally {
    await handle.close();
  }
}

/** @param {string[]} args */
function cli(args) {
  const result = spawnSync(
    process.execPath,
    ['--max-old-space-size=64', 'runtime/phargus.mjs', ...args],
    {
      cwd: phargusDirectory,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 300_000,
    },
  );
  const stderr = (result.stderr ?? '').slice(-2000);
  assert.equal(result.status, 0, `exit ${result.status} signal ${result.signal}: ${stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed));
  return parsed;
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'phargus-bounded-memory-'));
  recording = join(directory, 'unique-paths.ndjson');
  await writeRecording(recording);
});

after(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('AC-6: summarize --file finishes on 200,000 unique-path spans with a 64 MB heap', () => {
  const summary = cli(['summarize', '--file', recording]);
  assert.equal(summary.counts.spans, SPANS);
  assert.equal(summary.quality.truncated, false);
  assert.equal(summary.requests.routesFolded, true);
});

test('AC-7: compare finishes on two 200,000 unique-path recordings with a 64 MB heap', () => {
  const result = cli(['compare', '--before', recording, '--after', recording]);
  assert.equal(result.command, 'compare');
  assert.equal(result.before.requests.routesFolded, true);
  assert.equal(result.after.requests.routesFolded, true);
});
