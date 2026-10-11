import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRecord, quality, samplingInterval } from '../runtime/records.mjs';
import {
  summarizeEvents,
  summarizeFile,
  compareSummaries,
  evidenceProblems,
} from '../runtime/summary.mjs';
import { capture } from '../runtime/capture.mjs';
import { sample, window, ndjson, conditions } from './fixtures.mjs';

const MISMATCH = 'sampling interval differs from observed sample spacing';
const cli = fileURLToPath(new URL('../runtime/phargus.mjs', import.meta.url));

/** @param {unknown[]} values @param {number} [intervalMs] */
async function summarize(values, intervalMs) {
  async function* events() {
    for (const value of values) {
      const record = parseRecord(value);
      assert(record, 'interval fixtures must be valid Phargus events');
      yield record;
    }
  }
  return summarizeEvents(events(), 'interval-fixture', quality(), intervalMs);
}

/** @param {number[]} timestamps */
const samples = (timestamps) => timestamps.map((timestamp) => sample(timestamp));

/** @param {(dir: string) => Promise<void>} run */
async function withDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'phargus-interval-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** @param {string} directory @param {string} name @param {number[]} timestamps @param {Record<string, unknown>} [declared] */
async function recording(directory, name, timestamps, declared) {
  const file = join(directory, name + '.ndjson');
  const manifest = join(directory, name + '.manifest.json');
  await writeFile(file, ndjson(samples(timestamps)));
  await writeFile(
    manifest,
    JSON.stringify({
      schemaVersion: 1,
      quality: quality(),
      termination: 'eof',
      ...(declared ? { conditions: declared } : {}),
    }),
  );
  return { file, manifest };
}

test('interval precedence is flag, recorded manifest interval, declared conditions, then 1000', async () => {
  assert.deepEqual(samplingInterval(250, { intervalMs: 500 }, 100), {
    intervalMs: 250,
    source: 'flag',
  });
  assert.deepEqual(samplingInterval(undefined, { intervalMs: 500 }, 100), {
    intervalMs: 100,
    source: 'manifest',
  });
  assert.deepEqual(samplingInterval(undefined, { intervalMs: 500 }, 0), {
    intervalMs: 500,
    source: 'conditions',
  });
  assert.deepEqual(samplingInterval(undefined, { intervalMs: 500 }), {
    intervalMs: 500,
    source: 'conditions',
  });
  for (const declared of [undefined, null, {}, { intervalMs: 0 }, { intervalMs: '500' }])
    assert.deepEqual(samplingInterval(undefined, declared), {
      intervalMs: 1000,
      source: 'default',
    });
  await withDirectory(async (directory) => {
    const half = [0, 500, 1000, 1500];
    const declared = await recording(directory, 'declared', half, {
      ...conditions,
      intervalMs: 500,
      durationMs: 2000,
    });
    const fromConditions = await summarizeFile(declared.file, { manifest: declared.manifest });
    assert.equal(fromConditions.coverage.samplingIntervalMs, 500);
    assert.equal(fromConditions.coverage.samplingIntervalSource, 'conditions');
    assert.equal(fromConditions.coverage.observedIntervalMs, 500);
    assert.deepEqual(fromConditions.period, { startMs: 0, endMs: 2000, durationMs: 2000 });
    assert.deepEqual(evidenceProblems(fromConditions), []);

    const fromFlag = await summarizeFile(declared.file, {
      manifest: declared.manifest,
      intervalMs: 250,
    });
    assert.equal(fromFlag.coverage.samplingIntervalMs, 250);
    assert.equal(fromFlag.coverage.samplingIntervalSource, 'flag');
    assert(evidenceProblems(fromFlag).includes(MISMATCH));

    const plain = await recording(directory, 'plain', half);
    const fromDefault = await summarizeFile(plain.file, { manifest: plain.manifest });
    assert.equal(fromDefault.coverage.samplingIntervalMs, 1000);
    assert.equal(fromDefault.coverage.samplingIntervalSource, 'default');
    assert(evidenceProblems(fromDefault).includes(MISMATCH));
    const noManifest = await summarizeFile(plain.file);
    assert.equal(noManifest.coverage.samplingIntervalSource, 'default');

    /** @param {string[]} args */
    const run = (args) =>
      JSON.parse(execFileSync(process.execPath, [cli, 'summarize', ...args], { encoding: 'utf8' }));
    const base = ['--file', declared.file, '--manifest', declared.manifest];
    const derived = run(base).coverage;
    assert.equal(derived.samplingIntervalSource, 'conditions');
    assert.equal(derived.samplingIntervalMs, 500);
    const flagged = run([...base, '--interval-ms', '1000']).coverage;
    assert.equal(flagged.samplingIntervalSource, 'flag');
    assert.equal(flagged.samplingIntervalMs, 1000);
  });
});

test('observedIntervalMs is the rounded median of positive sample spacing', async () => {
  const odd = await summarize(samples([0, 1000, 2000, 2500, 3500, 4600]));
  assert.equal(odd.coverage.observedIntervalMs, 1000);
  const even = await summarize(samples([0, 1000, 2001, 3003, 4006]));
  assert.equal(even.coverage.observedIntervalMs, 1002);
  const repeated = await summarize(samples([0, 1000, 1000, 2000]));
  assert.equal(repeated.coverage.observedIntervalMs, 1000);
  assert.equal(repeated.quality.gaps, 1);
  const single = await summarize(samples([0]));
  assert.equal(single.coverage.observedIntervalMs, null);
  assert.equal(single.coverage.samplingIntervalSource, 'default');
  const windows = await summarize([window(0), window(1000)]);
  assert.equal(windows.coverage.observedIntervalMs, null);
  assert.equal(windows.coverage.samplingIntervalMs, null);
  assert.equal(windows.coverage.samplingIntervalSource, null);
  assert(!evidenceProblems(windows).includes(MISMATCH));
});

test('a sampling interval that contradicts observed spacing makes compare inconclusive', async () => {
  await withDirectory(async (directory) => {
    const declared = { ...conditions, durationMs: 6000 };
    const before = await recording(
      directory,
      'before',
      [0, 1000, 2000, 3000, 4000, 5000],
      declared,
    );
    const after = await recording(directory, 'after', [0, 2000, 4000], declared);
    const summaries = [
      await summarizeFile(before.file, { manifest: before.manifest }),
      await summarizeFile(after.file, { manifest: after.manifest }),
    ];
    assert.equal(summaries[0].coverage.observedIntervalMs, 1000);
    assert.equal(summaries[1].coverage.observedIntervalMs, 2000);
    const result = compareSummaries(summaries[0], summaries[1]);
    assert.equal(result.comparable, false);
    assert.equal(result.verdict, 'inconclusive');
    assert(result.reasons.includes('after: ' + MISMATCH));
    assert(!result.reasons.includes('before: ' + MISMATCH));
  });
});

test('mismatch tolerance accepts jitter within 5% only', async () => {
  const jitter = await summarize(samples([0, 1040, 2080, 3120]));
  assert.equal(jitter.coverage.observedIntervalMs, 1040);
  assert(!evidenceProblems(jitter).includes(MISMATCH));
  const drift = await summarize(samples([0, 1060, 2120, 3180]));
  assert.equal(drift.coverage.observedIntervalMs, 1060);
  assert(evidenceProblems(drift).includes(MISMATCH));
  const explicit = await summarize(samples([0, 500, 1000]), 500);
  assert.equal(explicit.coverage.samplingIntervalSource, 'flag');
  assert(!evidenceProblems(explicit).includes(MISMATCH));
});

test('file capture uses and records the declared sampling interval', async () => {
  await withDirectory(async (directory) => {
    const input = join(directory, 'raw.ndjson');
    const conditionFile = join(directory, 'conditions.json');
    await writeFile(input, ndjson(samples([0, 500, 1000, 1500])));
    await writeFile(conditionFile, JSON.stringify({ ...conditions, intervalMs: 500 }));
    const declared = await capture({
      file: input,
      out: join(directory, 'declared'),
      conditions: conditionFile,
    });
    assert.equal(declared.manifest.intervalMs, 500);
    assert.equal(declared.manifest.quality.gaps, 0);
    const summary = await summarizeFile(declared.eventsPath, { manifest: declared.manifestPath });
    assert.equal(summary.coverage.samplingIntervalSource, 'manifest');
    assert.equal(summary.coverage.samplingIntervalMs, 500);
    const flagged = await capture({ file: input, out: join(directory, 'flag'), intervalMs: 250 });
    assert.equal(flagged.manifest.intervalMs, 250);
    assert.equal(flagged.manifest.quality.gaps, 3);
    // A capture taken at a non-default interval without declared conditions keeps that
    // interval for a later summarize that omits --interval-ms.
    const unlabeled = await capture({
      file: input,
      out: join(directory, 'unlabeled'),
      intervalMs: 500,
    });
    const later = await summarizeFile(unlabeled.eventsPath, { manifest: unlabeled.manifestPath });
    assert.equal(later.coverage.samplingIntervalSource, 'manifest');
    assert.equal(later.coverage.samplingIntervalMs, 500);
    assert(!evidenceProblems(later).includes(MISMATCH));
    const overridden = await summarizeFile(unlabeled.eventsPath, {
      manifest: unlabeled.manifestPath,
      intervalMs: 1000,
    });
    assert.equal(overridden.coverage.samplingIntervalSource, 'flag');
    assert(evidenceProblems(overridden).includes(MISMATCH));
    const fallback = await capture({ file: input, out: join(directory, 'default') });
    assert.equal(fallback.manifest.intervalMs, 1000);
  });
});
