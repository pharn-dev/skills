import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sample, span, window, conditions, ndjson } from './fixtures.mjs';

const TRACKED_ROUTES = 10_000;
const OTHER = '(other)';

/** @param {unknown[]} values @param {string} [source] */
async function summarize(values, source = 'route-cap-fixture') {
  const { parseRecord, quality } = await import('../runtime/records.mjs');
  const { summarizeEvents } = await import('../runtime/summary.mjs');
  async function* events() {
    for (const value of values) {
      const record = parseRecord(value);
      assert(record, 'route cap fixtures must be valid Phargus events');
      yield record;
    }
  }
  return summarizeEvents(events(), source, quality());
}

/** @param {string} method @param {string} path @param {number} start @param {number} durationNs @param {number} [statusCode] */
function request(method, path, start, durationNs, statusCode = 200) {
  return { ...span(start, durationNs), name: method + ' ' + path, method, path, statusCode };
}

/** @param {number[]} values @param {number} p */
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
}

/**
 * Samples stamped 2000 and 3000 measured 1000 to 3000; every span lies fully inside that period.
 * Pair i is GET /users/<i>/orders with one span; every thousandth pair (i % 1000 === 7) is a 500.
 * @param {number} pairs
 */
function pairRecording(pairs) {
  /** @type {Array<ReturnType<typeof sample> | ReturnType<typeof request>>} */
  const values = [sample(2000), sample(3000)];
  for (let i = 0; i < pairs; i += 1) {
    const durationNs = 1_000_000 + (i % 997) * 1000;
    const statusCode = i % 1000 === 7 ? 500 : 200;
    const path = '/users/' + i + '/orders';
    values.push(request('GET', path, 1000 + (i % 1900), durationNs, statusCode));
  }
  return values;
}

// The first 10,000 pairs in recording order have one span each; the 10,001st pair has two.
const FOLDED = [
  request('POST', '/users/folded/orders', 2500, 7_000_000),
  request('POST', '/users/folded/orders', 2600, 9_000_000, 503),
];
function foldedRecording() {
  return [...pairRecording(TRACKED_ROUTES), ...FOLDED];
}

/** @param {unknown[]} values */
function spansOf(values) {
  return values.flatMap((value) => {
    const candidate = /** @type {{ type?: string, durationNs?: number, statusCode?: number }} */ (
      value
    );
    return candidate.type === 'span'
      ? [{ durationNs: Number(candidate.durationNs), statusCode: Number(candidate.statusCode) }]
      : [];
  });
}

test('AC-1: 10,001 distinct pairs fold the last pair into one (other) route and flag the table', async () => {
  const result = await summarize(foldedRecording());
  assert.equal(result.requests.routesFolded, true);
  assert.equal(result.requests.distinctRoutes, 10_001);
  const other = result.requests.routes.find(
    (route) => route.method === OTHER && route.path === OTHER,
  );
  assert(other, 'requests.routes must list the (other) route');
  assert.equal(other.count, 2);
});

test('AC-2: 9,999 or 10,000 distinct pairs are all tracked and nothing is folded', async () => {
  for (const pairs of [TRACKED_ROUTES - 1, TRACKED_ROUTES]) {
    const result = await summarize(pairRecording(pairs));
    assert.equal(result.requests.routesFolded, false, pairs + ' pairs');
    assert.equal(result.requests.distinctRoutes, pairs, pairs + ' pairs');
    assert(
      result.requests.routes.every((route) => route.method !== OTHER),
      pairs + ' pairs: no route may be (other)',
    );
  }
});

test('AC-3: whole-recording statistics and the (other) row stay exact past the cap', async () => {
  const values = foldedRecording();
  const result = await summarize(values);
  const all = spansOf(values);
  const durations = all.map((entry) => entry.durationNs);
  assert.equal(all.length, TRACKED_ROUTES + 2);
  assert.equal(result.requests.inPeriod, all.length);
  assert.equal(result.counts.spans, all.length);
  assert.equal(result.metrics.observedRequestP50Ns, percentile(durations, 0.5));
  assert.equal(result.metrics.observedRequestP99Ns, percentile(durations, 0.99));
  assert.equal(
    result.metrics.observedServerErrors,
    all.filter((entry) => entry.statusCode >= 500).length,
  );

  const folded = spansOf(FOLDED);
  const foldedDurations = folded.map((entry) => entry.durationNs);
  const other = result.requests.routes.find(
    (route) => route.method === OTHER && route.path === OTHER,
  );
  assert(other, 'requests.routes must list the (other) route');
  assert.equal(other.p50Ns, percentile(foldedDurations, 0.5));
  assert.equal(other.p99Ns, percentile(foldedDurations, 0.99));
  assert.equal(other.maxNs, Math.max(...foldedDurations));
  assert.equal(other.serverErrors, folded.filter((entry) => entry.statusCode >= 500).length);
  assert.equal(result.requests.routesFolded, true);
});

// 50 pairs with varied counts, durations and 5xx statuses, and some spans outside the period.
function fiftyPairRecording() {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  /** @type {Array<ReturnType<typeof sample> | ReturnType<typeof request>>} */
  // Samples stamped 2000 to 5000 measured 1000 to 5000.
  const values = [sample(2000), sample(3000), sample(4000), sample(5000)];
  for (let pair = 0; pair < 50; pair += 1) {
    const method = methods[pair % methods.length];
    const path = '/api/r' + String(pair).padStart(2, '0');
    const count = 1 + ((pair * 7) % 5);
    for (let k = 0; k < count; k += 1) {
      const start = 1000 + ((pair * 13 + k * 37) % 3800);
      const durationNs = (pair + 1) * 1_000_000 + k * 250_000;
      const statusCode = (pair + k) % 11 === 0 ? 503 : 200;
      values.push(request(method, path, start, durationNs, statusCode));
    }
    if (pair % 10 === 0) values.push(request(method, path, 500, 1_000_000));
    if (pair % 10 === 5) values.push(request(method, path, 7000, 2_000_000, 500));
  }
  return values;
}

// Captured from phargus 0.1.1 (summarizeEvents on fiftyPairRecording) before CORE-234 changed summary.mjs,
// with the sample period (CORE-235) and the stall counts (CORE-236) of main applied.
const EXPECTED_0_1_1 =
  '{"schemaVersion":1,"command":"summarize","source":"route-cap-fixture","period":{"startMs":1000,"endMs":5000,"durationMs":4000},"counts":{"samples":4,"windows":0,"spans":160,"alerts":0},"coverage":{"format":"samples","samplingIntervalMs":1000,"samplingIntervalSource":"default","observedIntervalMs":1000,"sampleCount":4},"requests":{"period":{"startMs":500,"endMs":7002,"durationMs":6502},"inPeriod":150,"outsidePeriod":10,"selection":"fully-contained-in-runtime-period","routes":[{"method":"PUT","path":"/api/r47","count":5,"p50Ns":48500000,"p99Ns":49000000,"maxNs":49000000,"serverErrors":0},{"method":"PUT","path":"/api/r42","count":5,"p50Ns":43500000,"p99Ns":44000000,"maxNs":44000000,"serverErrors":1},{"method":"PUT","path":"/api/r37","count":5,"p50Ns":38500000,"p99Ns":39000000,"maxNs":39000000,"serverErrors":0},{"method":"PUT","path":"/api/r32","count":5,"p50Ns":33500000,"p99Ns":34000000,"maxNs":34000000,"serverErrors":1},{"method":"PUT","path":"/api/r27","count":5,"p50Ns":28500000,"p99Ns":29000000,"maxNs":29000000,"serverErrors":0},{"method":"PUT","path":"/api/r22","count":5,"p50Ns":23500000,"p99Ns":24000000,"maxNs":24000000,"serverErrors":1},{"method":"PUT","path":"/api/r17","count":5,"p50Ns":18500000,"p99Ns":19000000,"maxNs":19000000,"serverErrors":0},{"method":"PUT","path":"/api/r12","count":5,"p50Ns":13500000,"p99Ns":14000000,"maxNs":14000000,"serverErrors":0},{"method":"PUT","path":"/api/r07","count":5,"p50Ns":8500000,"p99Ns":9000000,"maxNs":9000000,"serverErrors":1},{"method":"PUT","path":"/api/r02","count":5,"p50Ns":3500000,"p99Ns":4000000,"maxNs":4000000,"serverErrors":0},{"method":"PATCH","path":"/api/r49","count":4,"p50Ns":50250000,"p99Ns":50750000,"maxNs":50750000,"serverErrors":0},{"method":"PATCH","path":"/api/r44","count":4,"p50Ns":45250000,"p99Ns":45750000,"maxNs":45750000,"serverErrors":1},{"method":"PATCH","path":"/api/r39","count":4,"p50Ns":40250000,"p99Ns":40750000,"maxNs":40750000,"serverErrors":0},{"method":"PATCH","path":"/api/r34","count":4,"p50Ns":35250000,"p99Ns":35750000,"maxNs":35750000,"serverErrors":0},{"method":"PATCH","path":"/api/r29","count":4,"p50Ns":30250000,"p99Ns":30750000,"maxNs":30750000,"serverErrors":0},{"method":"PATCH","path":"/api/r24","count":4,"p50Ns":25250000,"p99Ns":25750000,"maxNs":25750000,"serverErrors":0},{"method":"PATCH","path":"/api/r19","count":4,"p50Ns":20250000,"p99Ns":20750000,"maxNs":20750000,"serverErrors":1},{"method":"PATCH","path":"/api/r14","count":4,"p50Ns":15250000,"p99Ns":15750000,"maxNs":15750000,"serverErrors":0},{"method":"PATCH","path":"/api/r09","count":4,"p50Ns":10250000,"p99Ns":10750000,"maxNs":10750000,"serverErrors":1},{"method":"PATCH","path":"/api/r04","count":4,"p50Ns":5250000,"p99Ns":5750000,"maxNs":5750000,"serverErrors":0}],"distinctRoutes":50},"quality":{"invalidRecords":0,"ignoredLogs":0,"truncated":false,"gaps":0,"stalledSamples":0,"stalledMs":0,"loss":{"known":true,"initial":{"samples":0,"spans":0},"delta":{"samples":0,"spans":0},"resets":0}},"metrics":{"heapUsedMaxBytes":1024,"rssMaxBytes":8192,"externalMaxBytes":512,"arrayBuffersMaxBytes":256,"eventLoopMaxNs":100000000,"maxSampleP99Ns":50000000,"gcCount":4,"gcTotalPauseNs":8000000,"gcMaxPauseNs":2000000,"backpressureEvents":4,"backpressureTotalStallNs":12000000,"backpressureMaxStallNs":3000000,"eventLoopMeanNs":10000000,"observedRequestP50Ns":25750000,"observedRequestP99Ns":50500000,"observedRequestRatePerSecond":37.5,"observedServerErrors":13},"memory":{"first":{"heapUsed":1024,"heapTotal":4096,"rss":8192,"external":512,"arrayBuffers":256},"last":{"heapUsed":1024,"heapTotal":4096,"rss":8192,"external":512,"arrayBuffers":256}},"hotspots":[{"site":"/app/stream.js:12:3","events":4,"totalStall":12000000,"maxStall":3000000}],"conditions":null}';

test('AC-4: a 50-pair summary is byte-identical to phargus 0.1.1 apart from routesFolded', async () => {
  const result = await summarize(fiftyPairRecording());
  const { routesFolded, ...requests } = result.requests;
  const { shortenedValues, ...quality } = result.quality;
  assert.equal(routesFolded, false);
  assert.equal(shortenedValues, 0);
  assert.equal(JSON.stringify({ ...result, requests, quality }), EXPECTED_0_1_1);
});

// AC-5 replays the fixture scenarios of summary-routes, summary-regressions and event-limits.

test('AC-5: the summary-routes ordering fixture keeps its routes and is not folded', async () => {
  const result = await summarize([
    sample(1000),
    sample(2000),
    request('GET', '/z', 1100, 5_000_000),
    request('GET', '/a', 1200, 10_000_000),
    request('POST', '/b', 1300, 50_000_000),
    request('GET', '/a', 1400, 30_000_000, 503),
    request('DELETE', '/z', 1500, 5_000_000),
    request('POST', '/b', 1600, 50_000_000),
    request('GET', '/y', 1700, 5_000_000),
    request('GET', '/a', 1800, 20_000_000),
    request('POST', '/b', 1900, 40_000_000, 500),
  ]);
  assert.equal(result.requests.inPeriod, 9);
  assert.equal(result.requests.distinctRoutes, 5);
  assert.deepEqual(result.requests.routes, [
    {
      method: 'POST',
      path: '/b',
      count: 3,
      p50Ns: 50_000_000,
      p99Ns: 50_000_000,
      maxNs: 50_000_000,
      serverErrors: 1,
    },
    {
      method: 'GET',
      path: '/a',
      count: 3,
      p50Ns: 20_000_000,
      p99Ns: 30_000_000,
      maxNs: 30_000_000,
      serverErrors: 1,
    },
    ...[
      ['DELETE', '/z'],
      ['GET', '/y'],
      ['GET', '/z'],
    ].map(([method, path]) => ({
      method,
      path,
      count: 1,
      p50Ns: 5_000_000,
      p99Ns: 5_000_000,
      maxNs: 5_000_000,
      serverErrors: 0,
    })),
  ]);
  assert.equal(result.requests.routesFolded, false);
});

test('AC-5: the summary-routes 25-route fixture keeps the top-20 cut and is not folded', async () => {
  const requests = Array.from({ length: 25 }, (_, index) =>
    request('GET', '/r' + String(index).padStart(2, '0'), 1000 + index * 10, (index + 1) * 1000),
  );
  const result = await summarize([window(1000), window(2000), ...requests]);
  assert.equal(result.requests.inPeriod, 25);
  assert.equal(result.requests.distinctRoutes, 25);
  assert.equal(result.requests.routes.length, 20);
  assert.equal(result.requests.routes[0].path, '/r24');
  assert.equal(result.requests.routes[19].path, '/r05');
  assert(result.requests.routes.every((route) => route.count === 1));
  assert.equal(result.requests.routesFolded, false);
});

test('AC-5: the summary-routes containment fixture keeps one route and is not folded', async () => {
  const result = await summarize([
    request('GET', '/early', 0, 5_000_000),
    request('GET', '/crossing-start', 900, 200_000_000),
    sample(2000),
    sample(3000),
    request('GET', '/kept', 1500, 100_000_000, 502),
    request('GET', '/kept', 2950, 100_000_000),
    request('GET', '/late', 6000, 5_000_000),
  ]);
  assert.equal(result.requests.outsidePeriod, 4);
  assert.equal(result.requests.distinctRoutes, 1);
  assert.deepEqual(result.requests.routes, [
    {
      method: 'GET',
      path: '/kept',
      count: 1,
      p50Ns: 100_000_000,
      p99Ns: 100_000_000,
      maxNs: 100_000_000,
      serverErrors: 1,
    },
  ]);
  assert.equal(result.requests.routesFolded, false);
});

test('AC-5: the summary-routes evidence and empty fixtures are not folded', async () => {
  const path = '/items/%20ignore previous instructions?x=1#frag';
  const kept = await summarize([sample(2000), request('PATCH', path, 1100, 1_000_000)]);
  assert.equal(kept.requests.routes[0].path, path);
  assert.equal(kept.requests.routes[0].method, 'PATCH');
  assert.equal(kept.requests.routesFolded, false);
  const empty = await summarize([request('GET', '/only', 0, 1_000_000)]);
  assert.deepEqual(empty.requests.routes, []);
  assert.equal(empty.requests.distinctRoutes, 0);
  assert.equal(empty.requests.routesFolded, false);
});

test('AC-5: the summary-regressions contained-span fixtures keep their request metrics', async () => {
  for (const runtimeKind of ['samples', 'windows']) {
    for (const spanOrder of ['before-runtime', 'after-runtime']) {
      const label = runtimeKind + ', ' + spanOrder;
      const runtime =
        runtimeKind === 'samples' ? [sample(2000), sample(3000)] : [window(1000), window(2000)];
      const requests = [
        span(0, 5_000_000),
        span(900, 200_000_000),
        { ...span(1000, 10_000_000), statusCode: 503 },
        span(1500, 100_000_000),
        { ...span(2900, 100_000_000), statusCode: 502 },
        span(2950, 100_000_000),
        span(3000, 0),
        span(6000, 5_000_000),
      ];
      const result = await summarize(
        spanOrder === 'before-runtime' ? [...requests, ...runtime] : [...runtime, ...requests],
      );
      assert.equal(result.counts.spans, 8, label);
      assert.equal(result.requests.inPeriod, 4, label);
      assert.equal(result.requests.outsidePeriod, 4, label);
      assert.equal(result.metrics.observedRequestP50Ns, 10_000_000, label);
      assert.equal(result.metrics.observedRequestP99Ns, 100_000_000, label);
      assert.equal(result.metrics.observedRequestRatePerSecond, 2, label);
      assert.equal(result.metrics.observedServerErrors, 2, label);
      assert.equal(result.requests.routesFolded, false, label);
    }
  }
});

test('AC-5: the summary-regressions span-only fixture has no aligned requests and is not folded', async () => {
  const result = await summarize([
    { ...span(0, 10_000_000), statusCode: 500 },
    span(1000, 20_000_000),
  ]);
  assert.equal(result.counts.spans, 2);
  assert.equal(result.requests.inPeriod, 0);
  assert.equal(result.requests.outsidePeriod, 2);
  assert.equal(result.metrics.observedRequestP50Ns, null);
  assert.equal(result.metrics.observedRequestP99Ns, null);
  assert.equal(result.requests.routesFolded, false);
});

test('AC-5: the summary-regressions compare fixture carries routesFolded false on both sides', async () => {
  const { compareSummaries } = await import('../runtime/summary.mjs');
  /** @param {number[]} timestamps */
  const measurement = async (timestamps) => {
    const result = await summarize(timestamps.map((timestamp) => sample(timestamp)));
    result.conditions = { ...conditions, durationMs: 6000 };
    return result;
  };
  const before = await measurement([0, 1000, 2000, 3000, 4000, 5000]);
  const after = await measurement([50, 1060, 2070, 3080, 4090, 5100]);
  assert.equal(before.requests.routesFolded, false);
  assert.equal(after.requests.routesFolded, false);
  const result = compareSummaries(before, after);
  assert.equal(result.verdict, 'requires-goal-assessment');
  assert.equal(result.before.requests.routesFolded, false);
  assert.equal(result.after.requests.routesFolded, false);
});

test('AC-5: the event-limits file fixture keeps every span and is not folded', async () => {
  const { quality } = await import('../runtime/records.mjs');
  const { summarizeFile, compareSummaries } = await import('../runtime/summary.mjs');
  const directory = await mkdtemp(join(tmpdir(), 'phargus-route-cap-'));
  try {
    const file = join(directory, 'run.ndjson');
    const manifest = join(directory, 'run.manifest.json');
    const records = [];
    for (let i = 1; i <= 60; i += 1) records.push({ event: 'sample', data: sample(i * 1000) });
    for (let i = 0; i < 12_000; i += 1)
      records.push({ event: 'span', data: span(i * 5, 1_000_000) });
    await writeFile(file, ndjson(records));
    await writeFile(
      manifest,
      JSON.stringify({
        schemaVersion: 1,
        source: { kind: 'file' },
        quality: quality(),
        termination: 'eof',
        conditions: { ...conditions, durationMs: 60_000 },
      }),
    );
    const summary = await summarizeFile(file, { manifest });
    assert.equal(summary.quality.truncated, false);
    assert.equal(summary.counts.samples, 60);
    assert.equal(summary.counts.spans, 12_000);
    assert.equal(summary.requests.routesFolded, false);
    const result = compareSummaries(summary, await summarizeFile(file, { manifest }));
    assert.equal(result.verdict, 'requires-goal-assessment');
    assert.equal(result.before.requests.routesFolded, false);
    assert.equal(result.after.requests.routesFolded, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
