import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRecord, quality } from '../runtime/records.mjs';
import { summarizeEvents, summarizeFile, compareSummaries } from '../runtime/summary.mjs';
import { sample, span, window, ndjson, conditions } from './fixtures.mjs';

const cli = fileURLToPath(new URL('../runtime/phargus.mjs', import.meta.url));

/** @param {unknown[]} values */
async function summarize(values) {
  async function* events() {
    for (const value of values) {
      const record = parseRecord(value);
      assert(record, 'regression fixtures must be valid Phargus events');
      yield record;
    }
  }
  return summarizeEvents(events(), 'summary-regression-fixture', quality());
}

/** @param {number[]} timestamps @param {number} declaredDurationMs */
async function measurement(timestamps, declaredDurationMs) {
  const result = await summarize(timestamps.map((timestamp) => sample(timestamp)));
  result.conditions = { ...conditions, durationMs: declaredDurationMs };
  return result;
}

test('rejects raw samples mixed with aggregated windows in either arrival order', async () => {
  for (const records of [
    [sample(0), window(0)],
    [window(0), sample(0)],
  ]) {
    await assert.rejects(
      summarize(records),
      /cannot combine raw samples with already aggregated windows/,
    );
  }
});

for (const runtimeKind of ['samples', 'windows']) {
  for (const spanOrder of ['before-runtime', 'after-runtime']) {
    test(
      'request metrics use only contained spans: ' + runtimeKind + ', ' + spanOrder,
      async () => {
        // Both measured 1000 to 3000: a sample covers the interval ending at its timestamp,
        // a window covers its own start and end.
        const runtime =
          runtimeKind === 'samples' ? [sample(2000), sample(3000)] : [window(1000), window(2000)];
        const requests = [
          span(0, 5_000_000),
          span(900, 200_000_000),
          { ...span(1000, 10_000_000), statusCode: 503 },
          span(1500, 100_000_000),
          { ...span(2900, 100_000_000), statusCode: 502 },
          span(2950, 100_000_000),
          // The period end is inclusive: an instant span at 3000 is contained.
          span(3000, 0),
          span(6000, 5_000_000),
        ];
        const result = await summarize(
          spanOrder === 'before-runtime' ? [...requests, ...runtime] : [...runtime, ...requests],
        );
        assert.deepEqual(result.period, { startMs: 1000, endMs: 3000, durationMs: 2000 });
        assert.equal(result.counts.spans, 8);
        assert.deepEqual(result.requests.period, { startMs: 0, endMs: 6005, durationMs: 6005 });
        assert.equal(result.requests.inPeriod, 4);
        assert.equal(result.requests.outsidePeriod, 4);
        assert.equal(typeof result.requests.selection, 'string');
        assert(result.requests.selection.length > 0);
        assert.equal(result.metrics.observedRequestP50Ns, 10_000_000);
        assert.equal(result.metrics.observedRequestP99Ns, 100_000_000);
        assert.equal(result.metrics.observedRequestRatePerSecond, 2);
        assert.equal(result.metrics.observedServerErrors, 2);
      },
    );
  }
}

test('span-only data cannot manufacture a runtime interval or aligned request metrics', async () => {
  const result = await summarize([
    { ...span(0, 10_000_000), statusCode: 500 },
    span(1000, 20_000_000),
  ]);
  assert.deepEqual(result.period, { startMs: null, endMs: null, durationMs: 0 });
  assert.equal(result.counts.spans, 2);
  assert.deepEqual(result.requests.period, { startMs: 0, endMs: 1020, durationMs: 1020 });
  assert.equal(result.requests.inPeriod, 0);
  assert.equal(result.requests.outsidePeriod, 2);
  for (const metric of [
    'observedRequestP50Ns',
    'observedRequestP99Ns',
    'observedRequestRatePerSecond',
    'observedServerErrors',
  ]) {
    assert.equal(result.metrics[metric], null, metric);
  }
});

test('retained request history cannot inflate recent runtime coverage', async () => {
  const result = await summarize([
    span(0, 20_000_000),
    sample(61_000),
    sample(62_000),
    span(61_000, 20_000_000),
  ]);
  assert.deepEqual(result.period, { startMs: 60_000, endMs: 62_000, durationMs: 2000 });
  assert.equal(result.requests.inPeriod, 1);
  assert.equal(result.requests.outsidePeriod, 1);
  assert.equal(result.metrics.observedRequestRatePerSecond, 0.5);
});

test('copied conditions do not make six seconds and two seconds comparable', async () => {
  const before = await measurement([0, 1000, 2000, 3000, 4000, 5000], 6000);
  const after = await measurement([0, 1000], 6000);
  assert.deepEqual(before.conditions, after.conditions);
  assert.equal(before.quality.gaps, 0);
  assert.equal(after.quality.gaps, 0);
  const result = compareSummaries(before, after);
  assert.equal(result.comparable, false);
  assert.equal(result.verdict, 'inconclusive');
  assert(result.reasons.some((reason) => /duration|coverage|interval/i.test(reason)));
});

test('equal short captures cannot claim a substantially longer declared duration', async () => {
  const before = await measurement([0, 1000], 6000);
  const after = await measurement([0, 1000], 6000);
  assert.deepEqual(before.period, after.period);
  assert.deepEqual(before.conditions, after.conditions);
  const result = compareSummaries(before, after);
  assert.equal(result.comparable, false);
  assert.equal(result.verdict, 'inconclusive');
  assert(result.reasons.some((reason) => /duration|coverage|interval/i.test(reason)));
});

test('sampling density still matters when timestamps have no individual gap violation', async () => {
  const dense = await measurement([0, 1000, 2000, 3000], 4000);
  const sparse = await measurement([0, 1500, 3000], 4000);
  assert.deepEqual(dense.period, sparse.period);
  assert.equal(dense.quality.gaps, 0);
  assert.equal(sparse.quality.gaps, 0);
  const result = compareSummaries(dense, sparse);
  assert.equal(result.comparable, false);
  assert.equal(result.verdict, 'inconclusive');
  assert(result.reasons.some((reason) => /sampl|coverage|density/i.test(reason)));
});

test('realistic sampling jitter remains comparable with matching conditions and coverage', async () => {
  const before = await measurement([0, 1000, 2000, 3000, 4000, 5000], 6000);
  const after = await measurement([50, 1060, 2070, 3080, 4090, 5100], 6000);
  assert.equal(after.period.durationMs, 6050);
  assert.equal(before.coverage.observedIntervalMs, 1000);
  assert.equal(after.coverage.observedIntervalMs, 1010);
  assert.equal(before.quality.gaps, 0);
  assert.equal(after.quality.gaps, 0);
  const result = compareSummaries(before, after);
  assert.equal(result.comparable, true);
  assert.equal(result.verdict, 'requires-goal-assessment');
});

test('a manifest counter that is not a non-negative integer is refused, never read as null', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-manifest-'));
  try {
    const file = join(directory, 'partial.ndjson');
    await writeFile(file, ndjson([sample(0), sample(1000)]) + '{"timestamp":\n');
    /** @param {string} name @param {Record<string, unknown>} counters */
    const manifest = async (name, counters) => {
      const path = join(directory, name + '.json');
      const counted = { truncated: false, gaps: 0, ...counters };
      await writeFile(
        path,
        JSON.stringify({ schemaVersion: 1, termination: 'eof', quality: counted }),
      );
      return path;
    };
    const valid = await manifest('valid', { invalidRecords: 2, ignoredLogs: 3 });
    const summary = await summarizeFile(file, { manifest: valid });
    assert.equal(summary.quality.invalidRecords, 3);
    assert.equal(summary.quality.ignoredLogs, 3);
    for (const [name, counters] of Object.entries({
      'm-nan': { invalidRecords: 'n/a', ignoredLogs: 0 },
      'm-missing': { ignoredLogs: 0 },
      'm-null': { invalidRecords: 0, ignoredLogs: null },
      'm-negative': { invalidRecords: -1, ignoredLogs: 0 },
      'm-fraction': { invalidRecords: 0, ignoredLogs: 1.5 },
    })) {
      const path = await manifest(name, counters);
      await assert.rejects(summarizeFile(file, { manifest: path }), /unsupported capture manifest/);
      const sides = ['--before', file, '--before-manifest', path];
      const result = spawnSync(
        process.execPath,
        [cli, 'compare', ...sides, '--after', file, '--after-manifest', path],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(JSON.parse(result.stderr).error.message, /unsupported capture manifest/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
