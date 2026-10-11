/** @param {number} timestamp @param {Partial<import('../runtime/types.js').Sample>} [overrides] @returns {import('../runtime/types.js').Sample} */
export function sample(timestamp, overrides = {}) {
  return {
    timestamp,
    eventLoop: { min: 1, max: 100_000_000, mean: 10_000_000, p50: 5_000_000, p99: 50_000_000 },
    memory: { heapUsed: 1024, heapTotal: 4096, rss: 8192, external: 512, arrayBuffers: 256 },
    gc: { count: 1, totalPause: 2_000_000, maxPause: 2_000_000 },
    backpressure: {
      events: 1,
      totalStall: 3_000_000,
      maxStall: 3_000_000,
      hotspots: [
        { site: '/app/stream.js:12:3', events: 1, totalStall: 3_000_000, maxStall: 3_000_000 },
      ],
    },
    dropped: { samples: 0, spans: 0 },
    ...overrides,
  };
}

/** @param {number} start @param {number} [lag] @returns {import('../runtime/types.js').Window} */
export function window(start, lag = 100_000_000) {
  return {
    start,
    end: start + 1000,
    count: 1,
    late: 0,
    eventLoop: { max: lag, p99: lag, mean: 10_000_000 },
    memory: { heapUsedLast: 1024, heapUsedMax: 2048, rssLast: 8192, rssMax: 16384 },
    gc: { count: 1, totalPause: 2_000_000, maxPause: 2_000_000 },
    backpressure: { events: 1, totalStall: 3_000_000, maxStall: 3_000_000 },
  };
}

/** @param {number} start @param {number} [durationNs] @returns {import('../runtime/types.js').Span} */
export function span(start, durationNs = 200_000_000) {
  return {
    type: 'span',
    traceId: 'a'.repeat(32),
    spanId: start.toString(16).padStart(16, '0'),
    name: 'GET /work',
    method: 'GET',
    path: '/work',
    statusCode: 200,
    startTimeMs: start,
    durationNs,
  };
}

export const conditions = {
  workload: 'same-fixture',
  concurrency: 1,
  requests: 100,
  warmupMs: 1000,
  durationMs: 3000,
  nodeVersion: '24.13.1',
  machine: 'local-fixture',
  intervalMs: 1000,
  windowMs: 1000,
};
/** @param {unknown[]} records */
export function ndjson(records) {
  return records.map((record) => JSON.stringify(record)).join('\n') + '\n';
}
