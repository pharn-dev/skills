import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRecord, quality, sampleInterval } from '../runtime/records.mjs';
import { summarizeEvents, summarizeFile, compareSummaries } from '../runtime/summary.mjs';
import { capture, eventEnd } from '../runtime/capture.mjs';
import { sample, span, window, ndjson, conditions } from './fixtures.mjs';

// The runtime stamps a sample when its interval closes, so a sample stamped T measured
// (T - interval, T]. An agent that starts at T and serves requests at once is measured.
const T = 1_700_000_000_000;
const OUTSIDE = 'request evidence outside runtime interval';
const samples = [1000, 2000, 3000, 4000, 5000, 6000].map((offset) => sample(T + offset));
const measured = [100, 500, 900].map((offset) => span(T + offset, 20_000_000));
const unmeasured = [6100, 6900].map((offset) => span(T + offset, 20_000_000));

/** @param {unknown[]} values @param {number} [intervalMs] */
async function summarize(values, intervalMs) {
  async function* events() {
    for (const value of values) {
      const record = parseRecord(value);
      assert(record, 'sample period fixtures must be valid Phargus events');
      yield record;
    }
  }
  return summarizeEvents(events(), 'sample-period-fixture', quality(), intervalMs);
}

test('a raw sample covers the interval that ends at its timestamp', () => {
  assert.deepEqual(sampleInterval(T + 1000, 1000), { startMs: T, endMs: T + 1000 });
  assert.equal(eventEnd({ event: 'sample', data: sample(T + 1000) }, 1000), T + 1000);
});

test('requests made in the first interval are measured; requests after the last sample are not', async () => {
  const result = await summarize([...samples, ...measured, ...unmeasured]);
  assert.deepEqual(result.period, { startMs: T, endMs: T + 6000, durationMs: 6000 });
  assert.equal(result.requests.inPeriod, 3);
  assert.equal(result.requests.outsidePeriod, 2);
});

test('the period end is inclusive and compared in whole milliseconds', async () => {
  const result = await summarize([
    ...samples,
    span(T + 6000, 0),
    span(T + 5990, 10_600_000),
    span(T + 5990, 11_000_000),
  ]);
  assert.equal(result.period.endMs, T + 6000);
  assert.equal(result.requests.inPeriod, 2);
  assert.equal(result.requests.outsidePeriod, 1);
});

test('N evenly spaced samples still span N intervals', async () => {
  const second = await summarize(samples);
  assert.equal(second.period.durationMs, 6 * 1000);
  const half = await summarize(
    [500, 1000, 1500, 2000].map((offset) => sample(T + offset)),
    500,
  );
  assert.deepEqual(half.period, { startMs: T, endMs: T + 2000, durationMs: 4 * 500 });
});

test('window records keep the start and end they carry', async () => {
  const result = await summarize([window(T + 1000), window(T + 2000), span(T + 3000, 0)]);
  assert.deepEqual(result.period, { startMs: T + 1000, endMs: T + 3000, durationMs: 2000 });
  assert.equal(result.requests.inPeriod, 1);
});

test('two captures of a recording with requests in the first interval are comparable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-period-'));
  try {
    const input = join(directory, 'shift.ndjson');
    const conditionFile = join(directory, 'conditions.json');
    await writeFile(input, ndjson([...samples, ...measured]));
    await writeFile(conditionFile, JSON.stringify({ ...conditions, durationMs: 6000 }));
    const summaries = [];
    for (const name of ['before', 'after']) {
      const run = await capture({
        file: input,
        out: join(directory, name),
        conditions: conditionFile,
      });
      summaries.push(await summarizeFile(run.eventsPath, { manifest: run.manifestPath }));
    }
    for (const summary of summaries) assert.equal(summary.requests.outsidePeriod, 0);
    const result = compareSummaries(summaries[0], summaries[1]);
    assert(!result.reasons.some((reason) => reason.endsWith(OUTSIDE)), result.reasons.join());
    assert.equal(result.comparable, true, result.reasons.join());
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
