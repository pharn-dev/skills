import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, readWindows, replayRules } from '../runtime/operations.mjs';
import { quality } from '../runtime/records.mjs';
import { window, ndjson } from './fixtures.mjs';

test('collect rejects bad --alerts and --sinks before resolving Phargus or arming a timer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-ops-'));
  try {
    const sinks = join(directory, 'sinks.json');
    const alerts = join(directory, 'alerts.json');
    await writeFile(sinks, JSON.stringify([{ type: 'stdout' }]));
    await writeFile(alerts, '{not json');
    // The project does not exist: reaching resolvePhargus would fail with a different error.
    const project = join(directory, 'missing-project');
    const base = { project, file: join(directory, 'events.ndjson'), durationMs: 600_000 };
    await assert.rejects(collect({ ...base, sinks }), /type must be file or webhook/);
    await assert.rejects(collect({ ...base, alerts }), SyntaxError);
    // A leaked 10-minute timer would keep this test file from exiting.
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('replayRules validates --mode before resolving Phargus or reading input', async () => {
  await assert.rejects(
    replayRules({
      project: '/nonexistent/phargus-project',
      file: '/nonexistent/events.ndjson',
      mode: 'bogus',
      rules: '/nonexistent/rules.json',
    }),
    /--mode must be alerts or sandbox/,
  );
});

// The window path never calls the collector module, so a stand-in is enough.
const noCollector = /** @type {import('../runtime/types.js').CollectorModule} */ (
  /** @type {unknown} */ ({})
);

test('readWindows fills the caller quality record: one hole between windows is one gap', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-ops-'));
  try {
    const file = join(directory, 'windows.ndjson');
    const starts = [0, 1000, 5000, 6000];
    await writeFile(
      file,
      ndjson(starts.map((start) => ({ event: 'window', data: window(start) }))),
    );
    const status = quality();
    const windows = await readWindows(file, noCollector, 1000, 10_000, 1000, status);
    assert.deepEqual(
      windows.map((entry) => entry.start),
      starts,
    );
    assert.equal(status.gaps, 1);
    assert.equal(status.loss.known, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rule replay refusal names its cause: invalid lines or the event cap', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-ops-'));
  try {
    const invalid = join(directory, 'invalid.ndjson');
    await writeFile(invalid, ndjson([{ event: 'window', data: window(0) }]) + 'app started\n');
    await assert.rejects(readWindows(invalid, noCollector, 1000), (error) => {
      assert(error instanceof Error);
      assert.match(error.message, /^rule replay requires valid, untruncated input: /);
      assert.match(error.message, /1 invalid lines \(rules does not apply --allow-logs\)/);
      assert.doesNotMatch(error.message, /--max-events/);
      return true;
    });
    const capped = join(directory, 'capped.ndjson');
    const starts = [0, 1000, 2000];
    await writeFile(
      capped,
      ndjson(starts.map((start) => ({ event: 'window', data: window(start) }))),
    );
    await assert.rejects(readWindows(capped, noCollector, 1000, 2), (error) => {
      assert(error instanceof Error);
      assert.match(error.message, /the 2-event cap was reached \(raise it with --max-events\)/);
      assert.doesNotMatch(error.message, /invalid lines/);
      return true;
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
