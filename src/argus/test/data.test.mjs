import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRecord, quality, fileEvents } from '../runtime/records.mjs';
import {
  summarizeEvents,
  summarizeFile,
  compareSummaries,
  percentage,
} from '../runtime/summary.mjs';
import { sample, span, window, ndjson, conditions } from './fixtures.mjs';

test('validates every supported record and retains cumulative loss counters', () => {
  assert.equal(parseRecord(sample(0))?.event, 'sample');
  assert.equal(parseRecord(span(0))?.event, 'span');
  assert.equal(parseRecord(window(0))?.event, 'window');
  assert.equal(parseRecord({ event: 'window', data: window(0) })?.event, 'window');
  assert.equal(parseRecord({ ...window(0), end: 0 }), null);
  assert.equal(parseRecord({ ...sample(0), dropped: { samples: -1, spans: 0 } }), null);
  assert.equal(parseRecord({ ...sample(0), eventLoop: { max: '100 ms' } }), null);
});

test('preserves nanoseconds, max-of-sample-p99 and observed request percentiles', async () => {
  const raw = [
    sample(0, {
      eventLoop: { min: 1, max: 100_000_000, mean: 10_000_000, p50: 5_000_000, p99: 10_000_000 },
    }),
    sample(1000),
    span(0, 10_000_000),
    span(1000, 90_000_000),
  ];
  async function* events() {
    for (const value of raw) {
      const record = parseRecord(value);
      assert(record);
      yield record;
    }
  }
  const result = await summarizeEvents(events(), 'fixture', quality());
  assert.equal(result.metrics.eventLoopMaxNs, 100_000_000);
  assert.equal(result.metrics.maxSampleP99Ns, 50_000_000);
  assert.equal(result.metrics.observedRequestP99Ns, 90_000_000);
  assert.equal(result.metrics.gcTotalPauseNs, 4_000_000);
  assert.equal(result.hotspots[0].events, 2);
  assert.equal(result.quality.loss.known, true);
});

test('tracks gaps and counter reset as separate evidence problems', async () => {
  const raw = [
    sample(0, { dropped: { samples: 10, spans: 20 } }),
    sample(1000, { dropped: { samples: 12, spans: 23 } }),
    // Counters restarted: records dropped since the restart (4, 5) still count as loss.
    sample(3000, { dropped: { samples: 4, spans: 5 } }),
    sample(4000, { dropped: { samples: 5, spans: 7 } }),
  ];
  async function* events() {
    for (const value of raw) {
      const record = parseRecord(value);
      assert(record);
      yield record;
    }
  }
  const result = await summarizeEvents(events(), 'fixture', quality());
  assert.deepEqual(result.quality.loss.initial, { samples: 10, spans: 20 });
  assert.deepEqual(result.quality.loss.delta, { samples: 2 + 4 + 1, spans: 3 + 5 + 2 });
  assert.equal(result.quality.loss.resets, 1);
  assert.equal(result.quality.gaps, 1);
});

test('SSE/persisted windows never invent loss counters or external memory', async () => {
  async function* events() {
    yield { event: /** @type {const} */ ('window'), data: window(0) };
  }
  const result = await summarizeEvents(events(), 'SSE', quality());
  assert.equal(result.quality.loss.known, false);
  assert.equal(result.metrics.externalMaxBytes, null);
  assert.deepEqual(result.hotspots, []);
  assert(compareSummaries(result, result).reasons.includes('before: record loss is unknown'));
});

test('reports corrupt data, allows explicit unrelated logs, and marks event limits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argus-data-'));
  try {
    const path = join(directory, 'input.ndjson');
    await writeFile(
      path,
      'application started\n' +
        JSON.stringify({ timestamp: 10 }) +
        '\n' +
        ndjson([sample(0), sample(1000)]),
    );
    const status = quality();
    const received = [];
    for await (const record of fileEvents(path, status, { allowLogs: true, maxEvents: 1 }))
      received.push(record);
    assert.equal(received.length, 1);
    assert.equal(status.ignoredLogs, 1);
    assert.equal(status.invalidRecords, 1);
    assert.equal(status.truncated, true);
    const empty = join(directory, 'empty.ndjson');
    await writeFile(empty, '');
    const result = await summarizeFile(empty);
    assert.equal(result.period.startMs, null);
    assert.equal(result.metrics.eventLoopMeanNs, null);
    assert.equal(compareSummaries(result, result).verdict, 'inconclusive');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('comparison requires matching recorded conditions; zero baseline has no percentage', async () => {
  async function* events() {
    yield { event: /** @type {const} */ ('sample'), data: sample(0) };
    yield { event: /** @type {const} */ ('sample'), data: sample(1000) };
  }
  const before = await summarizeEvents(events(), 'before', quality());
  const after = await summarizeEvents(events(), 'after', quality());
  before.conditions = { ...conditions, durationMs: 2000 };
  after.conditions = { ...conditions, durationMs: 2000 };
  assert.equal(compareSummaries(before, after).comparable, true);
  after.conditions.requests = 60;
  assert.equal(compareSummaries(before, after).verdict, 'inconclusive');
  assert(compareSummaries(before, after).reasons.includes('different condition: requests'));
  assert.equal(percentage(0, 100), null);
  assert.equal(percentage(100, 50), -50);
});
