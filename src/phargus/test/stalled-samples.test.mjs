import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRecord, quality, qualityTracker } from '../runtime/records.mjs';
import { summarizeFile, compareSummaries } from '../runtime/summary.mjs';
import { sample, window, ndjson, conditions } from './fixtures.mjs';

const INTERVAL_MS = 1000;
const DURATION_REASON = 'recorded sample coverage differs from declared durationMs';
const COVERAGE_REASON = 'different recorded sample coverage';

/** A raw sample whose own `eventLoop.max` reports a stall of `stallMs` milliseconds.
 *  @param {number} timestamp @param {number} stallMs */
function stalled(timestamp, stallMs) {
  return sample(timestamp, { eventLoop: { ...sample(0).eventLoop, max: stallMs * 1_000_000 } });
}

/** Feeds raw records to a fresh quality tracker at 1000 ms and returns the quality it filled.
 *  @param {unknown[]} values */
async function track(values) {
  const status = quality();
  const tracker = qualityTracker(status, INTERVAL_MS);
  for (const value of values) {
    const record = parseRecord(value);
    assert(record, 'stalled-sample fixtures must be valid Phargus events');
    tracker.add(record);
  }
  return status;
}

/** @param {import('../runtime/types.js').Quality} status */
const counters = (status) => ({
  gaps: status.gaps,
  stalledSamples: status.stalledSamples,
  stalledMs: status.stalledMs,
});

test('a fresh quality record has no stalled samples and no stalled time', () => {
  const fresh = quality();
  assert.equal(fresh.stalledSamples, 0);
  assert.equal(fresh.stalledMs, 0);
});

test('a late raw sample explained by its own stall is a stalled sample, not a gap', async () => {
  assert.deepEqual(
    counters(await track([sample(0), stalled(1800, 800)])),
    { gaps: 0, stalledSamples: 1, stalledMs: 800 },
    '1800 ms after its predecessor with an 800 ms stall',
  );
  assert.deepEqual(
    counters(await track([sample(0), stalled(2300, 800)])),
    { gaps: 0, stalledSamples: 1, stalledMs: 1300 },
    'lateness exactly 1300 ms (max + 0.5 x interval) is still stalled',
  );
});

test('a late raw sample its stall does not explain is a gap', async () => {
  assert.deepEqual(
    counters(await track([sample(0), stalled(2301, 800)])),
    { gaps: 1, stalledSamples: 0, stalledMs: 0 },
    'lateness 1301 ms with an 800 ms stall',
  );
  assert.deepEqual(
    counters(await track([sample(0), stalled(58_000, 100)])),
    { gaps: 1, stalledSamples: 0, stalledMs: 0 },
    '58 s after its predecessor with a small stall',
  );
});

test('a timestamp at or before its predecessor is a gap whatever its stall', async () => {
  assert.deepEqual(
    counters(await track([sample(0), sample(1000), stalled(1000, 10_000)])),
    { gaps: 1, stalledSamples: 0, stalledMs: 0 },
    'repeated timestamp',
  );
  assert.deepEqual(
    counters(await track([sample(0), sample(1000), stalled(400, 10_000)])),
    { gaps: 1, stalledSamples: 0, stalledMs: 0 },
    'backwards timestamp',
  );
});

test('a raw sample at most half an interval late changes no counter', async () => {
  assert.deepEqual(
    counters(await track([sample(0), sample(1000), sample(2500), stalled(4000, 800)])),
    { gaps: 0, stalledSamples: 0, stalledMs: 0 },
  );
});

test('window records with a hole are still a gap and never stalled', async () => {
  assert.deepEqual(counters(await track([window(0), window(3000, 5_000_000_000)])), {
    gaps: 1,
    stalledSamples: 0,
    stalledMs: 0,
  });
});

/** Raw samples stamped at the end of each 1000 ms tick; a tick in `lateTicks` is 800 ms late and
 *  carries that 800 ms stall in its own `eventLoop.max`. Later ticks are scheduled from it.
 *  @param {number} count @param {number[]} lateTicks */
function ticks(count, lateTicks) {
  const records = [];
  let timestamp = 0;
  for (let index = 0; index < count; index += 1) {
    const late = lateTicks.includes(index);
    timestamp += INTERVAL_MS + (late ? 800 : 0);
    records.push(late ? stalled(timestamp, 800) : sample(timestamp));
  }
  return records;
}

/** Writes before/after recordings under the same declared conditions, summarizes both from
 *  disk and compares them.
 *  @param {unknown[]} beforeRecords @param {unknown[]} afterRecords */
async function compareRecordings(beforeRecords, afterRecords) {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-stalled-'));
  try {
    const declared = { ...conditions, durationMs: 30_000, intervalMs: INTERVAL_MS };
    /** @param {string} name @param {unknown[]} records */
    const summarize = async (name, records) => {
      const file = join(directory, name + '.ndjson');
      const manifest = join(directory, name + '.manifest.json');
      await writeFile(file, ndjson(records));
      await writeFile(
        manifest,
        JSON.stringify({
          schemaVersion: 1,
          quality: quality(),
          termination: 'eof',
          conditions: declared,
        }),
      );
      return summarizeFile(file, { manifest });
    };
    const before = await summarize('before', beforeRecords);
    const after = await summarize('after', afterRecords);
    return { before, after, result: compareSummaries(before, after) };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('one tick delayed by its own stall still compares against on-time samples', async () => {
  const { before, result } = await compareRecordings(ticks(30, [10]), ticks(30, []));
  assert.equal(before.quality.gaps, 0);
  assert.equal(before.quality.stalledSamples, 1);
  assert.equal(result.comparable, true, result.reasons.join('; '));
  assert.notEqual(result.verdict, 'inconclusive');
});

test('sample coverage counts stalled time against durationMs and the other side', async () => {
  const { result } = await compareRecordings(ticks(26, [5, 10, 15, 20]), ticks(30, []));
  assert.equal(result.comparable, true, result.reasons.join('; '));
  assert(
    !result.reasons.some((reason) => reason.includes(DURATION_REASON)),
    result.reasons.join('; '),
  );
  assert(
    !result.reasons.some((reason) => reason.includes(COVERAGE_REASON)),
    result.reasons.join('; '),
  );
});
