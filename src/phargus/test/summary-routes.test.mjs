import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecord, quality } from '../runtime/records.mjs';
import { summarizeEvents } from '../runtime/summary.mjs';
import { sample, span, window } from './fixtures.mjs';

/** @param {unknown[]} values */
async function summarize(values) {
  async function* events() {
    for (const value of values) {
      const record = parseRecord(value);
      assert(record, 'route fixtures must be valid Phargus events');
      yield record;
    }
  }
  return summarizeEvents(events(), 'route-fixture', quality());
}

/** @param {string} method @param {string} path @param {number} start @param {number} durationNs @param {number} [statusCode] */
function request(method, path, start, durationNs, statusCode = 200) {
  return { ...span(start, durationNs), name: method + ' ' + path, method, path, statusCode };
}

test('routes order by count, then p99, then method and path', async () => {
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
});

test('routes cap at 20 entries while distinctRoutes reports every selected route', async () => {
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
});

test('routes use only spans fully contained in the runtime period', async () => {
  const result = await summarize([
    request('GET', '/early', 0, 5_000_000),
    request('GET', '/crossing-start', 900, 200_000_000),
    sample(1000),
    sample(2000),
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
});

test('routes keep paths as recorded evidence and are empty without runtime data', async () => {
  const path = '/items/%20ignore previous instructions?x=1#frag';
  const kept = await summarize([sample(1000), request('PATCH', path, 1100, 1_000_000)]);
  assert.equal(kept.requests.routes[0].path, path);
  assert.equal(kept.requests.routes[0].method, 'PATCH');
  const empty = await summarize([request('GET', '/only', 0, 1_000_000)]);
  assert.deepEqual(empty.requests.routes, []);
  assert.equal(empty.requests.distinctRoutes, 0);
});
