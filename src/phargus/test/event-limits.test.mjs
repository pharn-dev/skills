import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { quality } from '../runtime/records.mjs';
import { summarizeFile, compareSummaries } from '../runtime/summary.mjs';
import { capture, LIVE_MAX_EVENTS } from '../runtime/capture.mjs';
import { readWindows } from '../runtime/operations.mjs';
import { sample, span, window, ndjson, conditions } from './fixtures.mjs';

const TRUNCATED = 'capture was truncated';
const cli = fileURLToPath(new URL('../runtime/phargus.mjs', import.meta.url));

/** @param {(dir: string) => Promise<void>} run */
async function withDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-limits-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

// 60 s at 200 req/s: 60 one-second samples and 12,000 spans, beyond the live 10,000 limit.
/** @param {string} directory @param {string} name */
async function recording(directory, name) {
  const file = join(directory, name + '.ndjson');
  const manifest = join(directory, name + '.manifest.json');
  const records = [];
  for (let i = 0; i < 60; i += 1) records.push({ event: 'sample', data: sample(i * 1000) });
  for (let i = 0; i < 12_000; i += 1) records.push({ event: 'span', data: span(i * 5, 1_000_000) });
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
  return { file, manifest };
}

test('file reads keep every event by default, so a 60 s / 200 req/s run stays comparable', async () => {
  await withDirectory(async (directory) => {
    const before = await recording(directory, 'before');
    const after = await recording(directory, 'after');
    const summary = await summarizeFile(before.file, { manifest: before.manifest });
    assert.equal(summary.quality.truncated, false);
    assert.equal(summary.counts.samples, 60);
    assert.equal(summary.counts.spans, 12_000);
    const result = compareSummaries(
      summary,
      await summarizeFile(after.file, { manifest: after.manifest }),
    );
    assert(!result.reasons.some((reason) => reason.endsWith(TRUNCATED)), result.reasons.join());
    assert.equal(result.verdict, 'requires-goal-assessment');

    // The CLI applies no default event limit to files either.
    /** @param {string[]} args */
    const run = (args) =>
      JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8' }));
    const files = [
      'compare',
      ...['--before', before.file, '--before-manifest', before.manifest],
      ...['--after', after.file, '--after-manifest', after.manifest],
    ];
    const unbounded = run(files);
    assert.equal(unbounded.verdict, 'requires-goal-assessment');
    assert.equal(unbounded.before.counts.spans, 12_000);
    const summarized = run(['summarize', '--file', before.file, '--manifest', before.manifest]);
    assert.equal(summarized.quality.truncated, false);
  });
});

test('an explicit --max-events still truncates a file read', async () => {
  await withDirectory(async (directory) => {
    const { file, manifest } = await recording(directory, 'run');
    const summary = await summarizeFile(file, { manifest, maxEvents: 100 });
    assert.equal(summary.quality.truncated, true);
    assert.equal(summary.counts.samples + summary.counts.spans, 100);
    const result = compareSummaries(summary, await summarizeFile(file, { manifest }));
    assert.equal(result.verdict, 'inconclusive');
    assert(result.reasons.includes('before: ' + TRUNCATED));
    const cliSummary = JSON.parse(
      execFileSync(process.execPath, [cli, 'summarize', '--file', file, '--max-events', '100'], {
        encoding: 'utf8',
      }),
    );
    assert.equal(cliSummary.quality.truncated, true);
  });
});

test('rule replay, which buffers its input, keeps the 10,000-event default', async () => {
  await withDirectory(async (directory) => {
    const file = join(directory, 'windows.ndjson');
    const records = [];
    for (let i = 0; i < 12_000; i += 1) records.push({ event: 'window', data: window(i * 1000) });
    await writeFile(file, ndjson(records));
    const api = /** @type {import('../runtime/types.js').CollectorModule} */ (
      /** @type {unknown} */ ({})
    );
    await assert.rejects(readWindows(file, api, 1000), /untruncated/);
    assert.equal((await readWindows(file, api, 1000, 12_000)).length, 12_000);
  });
});

test('live SSE capture still stops at 10,000 events by default', async () => {
  assert.equal(LIVE_MAX_EVENTS, 10_000);
  const directory = await mkdtemp(join(tmpdir(), 'phargus-limits-sse-'));
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const now = Date.now();
    let body = '';
    for (let i = 0; i < 10_005; i += 1)
      body += 'event: window\ndata: ' + JSON.stringify(window(now + i)) + '\n\n';
    res.write(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  try {
    const result = await capture({
      url: 'http://127.0.0.1:' + address.port + '/events',
      out: directory,
      // The limit, not the clock, must end the capture; per-event writes are slow on loaded runners.
      durationMs: 120_000,
    });
    assert.equal(result.manifest.events, 10_000);
    assert.equal(result.manifest.termination, 'limit');
    assert.equal(result.manifest.quality.truncated, true);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(() => resolve(undefined)));
    await rm(directory, { recursive: true, force: true });
  }
});
