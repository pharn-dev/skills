import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { readFile, writeFile, rename, mkdtemp, mkdir, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { root, pluginPath } from '../../scripts/generate.mjs';
import { capture } from '../../runtime/capture.mjs';
import { collect, heap, replayRules } from '../../runtime/operations.mjs';
import { doctor, resolvePhargus } from '../../runtime/upstream.mjs';
import { sample, span, window, ndjson } from '../fixtures.mjs';
import { fileEvents, quality } from '../../runtime/records.mjs';
import { summarizeFile } from '../../runtime/summary.mjs';

const prepared = JSON.parse(await readFile(join(root, '.cache/integration.json'), 'utf8'));
const project = prepared.project;
const scratch = await mkdtemp(join(tmpdir(), 'phargus-integration-'));
test.after(async () => {
  await rm(scratch, { recursive: true, force: true });
});

/** @param {import('node:child_process').ChildProcessWithoutNullStreams} child */
async function ready(child) {
  return await new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => reject(new Error('application readiness timed out')), 10_000);
    child.once('error', reject);
    child.once('exit', (code) => {
      if (!text.includes('\n')) reject(new Error('app exited before readiness: ' + code));
    });
    child.stdout.on('data', (chunk) => {
      text += chunk.toString();
      if (text.includes('\n')) {
        clearTimeout(timer);
        resolve(JSON.parse(text.split('\n')[0]));
      }
    });
  });
}

test('doctor resolves exports without auto-starting the agent', async () => {
  const result = await doctor(project);
  assert.equal(result.package.version, '0.1.0');
  assert.equal(result.package.testedCommit, prepared.commit);
  assert.equal(result.package.sourceCommitVerified, false);
  assert.equal(Object.keys(result.exports).length, 6);
  const missing = await mkdtemp(join(scratch, 'missing-'));
  await writeFile(join(missing, 'package.json'), '{}');
  await assert.rejects(doctor(missing), /not installed/);
});

test('doctor does not echo arbitrary config keys or inline script credentials', async () => {
  const pkgPath = join(project, 'package.json');
  const original = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(original);
  pkg.scripts = { start: 'TOKEN=fixture-private-value node app.cjs' };
  const configPath = join(project, 'phargus.config.json');
  await writeFile(pkgPath, JSON.stringify(pkg));
  await writeFile(
    configPath,
    JSON.stringify({ output: 'stdout', enabled: true, token: 'fixture-private-value' }),
  );
  try {
    const report = await doctor(project);
    assert(!JSON.stringify(report).includes('fixture-private-value'));
    assert.deepEqual(report.application.scriptNames, ['start']);
  } finally {
    await writeFile(pkgPath, original);
    await rm(configPath);
  }
});

for (const format of ['cjs', 'mjs']) {
  test('real ' + format + ' startup emits samples/spans and reaches collector SSE', async () => {
    const file = join(scratch, 'agent-' + format + '.ndjson');
    const app = join(project, 'app.' + format);
    const serverCode =
      "const server = http.createServer((_req, res) => res.end('ok')); server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port}))); process.on('SIGTERM', () => server.close());";
    await writeFile(
      app,
      (format === 'cjs' ? "const http = require('node:http');" : "import http from 'node:http';") +
        serverCode,
    );
    const child = spawn(
      process.execPath,
      [format === 'cjs' ? '--require' : '--import', '@pharn-dev/phargus/agent', app],
      {
        cwd: project,
        env: { ...process.env, PHARGUS_OUTPUT: file, PHARGUS_INTERVAL_MS: '50' },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const exit = new Promise((resolve) => child.once('exit', resolve));
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    try {
      const started = /** @type {{url: string}} */ (await ready(child));
      assert.equal((await fetch(started.url)).status, 200);
      await sleep(200);
    } finally {
      child.kill('SIGTERM');
      await exit;
    }
    assert(!stderr.includes('agent disabled'), stderr);
    const records = (await readFile(file, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert(records.some((record) => typeof record.timestamp === 'number'));
    assert(records.some((record) => record.type === 'span' && record.statusCode === 200));
    // Use the actual exported dashboard over collected raw data, not a mock API.
    const upstream = await resolvePhargus(project);
    const { createCollector } = /** @type {import('../../runtime/types.js').CollectorModule} */ (
      /** @type {unknown} */ (upstream.load('collector', ['createCollector']))
    );
    const { createDashboardServer } =
      /** @type {import('../../runtime/types.js').DashboardModule} */ (
        /** @type {unknown} */ (upstream.load('dashboard', ['createDashboardServer']))
      );
    const collector = createCollector({ windowMs: 100, capacity: 20 });
    async function* parsed() {
      for (const record of records) yield record;
    }
    await collector.consume(parsed());
    const dashboard = await createDashboardServer({ collector, host: '127.0.0.1', port: 0 });
    try {
      const result = await capture({
        url: dashboard.url + '/events',
        out: join(scratch, 'sse-' + format),
        durationMs: 150,
      });
      assert(result.manifest.events >= 2);
      const captured = await readFile(result.eventsPath, 'utf8');
      assert(captured.includes('"event":"window"'));
      assert(captured.includes('"event":"span"'));
    } finally {
      await dashboard.close();
      await collector.close();
    }
  });
}

test('collect closes the server and follows raw input for a bounded diagnostic run', async () => {
  const file = join(scratch, 'collect.ndjson');
  const { sample } = await import('../fixtures.mjs');
  await writeFile(file, ndjson([sample(Date.now())]));
  const result = await collect({ project, file, follow: true, durationMs: 100, port: 0 });
  assert.equal(result.windows, 1);
  await assert.rejects(fetch(result.url));
});

test(
  'collect --follow stops on the first SIGTERM and prints its result',
  { skip: process.platform === 'win32' && 'POSIX signals only' },
  async () => {
    const file = join(scratch, 'collect-signal.ndjson');
    await writeFile(file, ndjson([sample(Date.now())]));
    const args = ['collect', '--project', project, '--file', file, '--follow', '--port', '0'];
    const child = spawn(process.execPath, [join(root, 'runtime/phargus.mjs'), ...args]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    const ended = new Promise((resolve) => child.once('close', (code) => resolve(code)));
    // The ready event is written after the handlers are armed and the dashboard listens.
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('collect readiness timed out')), 10_000);
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
        if (stderr.includes('"event":"ready"')) {
          clearTimeout(timer);
          resolve(undefined);
        }
      });
    });
    child.kill('SIGTERM');
    assert.equal(await ended, 0, stderr);
    const result = JSON.parse(stdout);
    assert.equal(result.command, 'collect');
    assert.equal(result.quality.invalidRecords, 0);
  },
);

test('file and live collection distinguish unrelated logs from valid samples', async () => {
  const file = join(scratch, 'collect-logs.ndjson');
  await writeFile(
    file,
    'application started\n' +
      JSON.stringify({ level: 'info', message: 'ready' }) +
      '\n' +
      ndjson([sample(Date.now())]),
  );
  const status = quality();
  const records = [];
  for await (const record of fileEvents(file, status, { allowLogs: true })) records.push(record);
  assert.equal(records.length, 1);
  assert.equal(status.ignoredLogs, 2);
  assert.equal(status.invalidRecords, 0);
  for (const follow of [false, true]) {
    const result = await collect({
      project,
      file,
      follow,
      allowLogs: true,
      durationMs: 100,
      port: 0,
    });
    assert.equal(result.windows, 1);
    assert.equal(result.quality.ignoredLogs, status.ignoredLogs);
    assert.equal(result.quality.invalidRecords, status.invalidRecords);
    await assert.rejects(fetch(result.url));
  }
});

test('file and live collection reject corrupt Phargus records even when logs are allowed', async () => {
  const file = join(scratch, 'collect-corrupt.ndjson');
  for (const corrupt of [
    JSON.stringify({ timestamp: Date.now(), eventLoop: { max: 'corrupt' } }),
    '{"timestamp":123,"eventLoop":',
  ]) {
    await writeFile(file, 'ordinary log\n' + ndjson([sample(Date.now())]) + corrupt + '\n');
    const status = quality();
    const records = [];
    for await (const record of fileEvents(file, status, { allowLogs: true })) records.push(record);
    assert.equal(records.length, 1);
    assert.equal(status.ignoredLogs, 1);
    assert.equal(status.invalidRecords, 1);
    for (const follow of [false, true]) {
      await assert.rejects(
        collect({ project, file, follow, allowLogs: true, durationMs: 100, port: 0 }),
        /invalid (?:input records|NDJSON record)/,
      );
    }
  }
});

test('heap summaries/diffs use actual V8 snapshots and analyzer workers', async () => {
  const before = join(scratch, 'before.heapsnapshot');
  const after = join(scratch, 'after.heapsnapshot');
  for (const [path, count] of [
    [before, 5],
    [after, 100],
  ])
    execFileSync(process.execPath, [
      '-e',
      'class PhargusAiRetainedMarker {} globalThis.retained = Array.from({length:' +
        count +
        '},()=>new PhargusAiRetainedMarker()); require("node:v8").writeHeapSnapshot(' +
        JSON.stringify(path) +
        ');',
    ]);
  const summarized = await heap({ project, file: before });
  assert.equal(summarized.mode, 'summary');
  assert(summarized.result);
  const diff = await heap({ project, before, after });
  const result = /** @type {{entries: {name: string, countDelta: number}[]}} */ (diff.result);
  assert(
    result.entries.some(
      (entry) => entry.name === 'PhargusAiRetainedMarker' && entry.countDelta > 0,
    ),
  );
});

test('alert replay preserves equality, sustained windows and firing/resolved edges', async () => {
  const file = join(scratch, 'windows.ndjson');
  await writeFile(
    file,
    ndjson([window(0, 10), window(1000, 50), window(2000, 60), window(3000, 70), window(4000, 10)]),
  );
  const rules = join(scratch, 'alerts.json');
  for (const comparison of ['>', '>=']) {
    await writeFile(
      rules,
      JSON.stringify([
        { id: 'lag', metric: 'eventLoop.max', comparison, threshold: 50, forWindows: 2 },
      ]),
    );
    const result = await replayRules({ project, file, mode: 'alerts', rules });
    assert(result.alerts);
    assert.deepEqual(
      result.alerts.map((alert) => [alert.state, alert.windowStart]),
      [
        ['firing', comparison === '>' ? 3000 : 2000],
        ['resolved', 4000],
      ],
    );
  }
});

test('rules CLI preserves its default event cap and accepts an explicitly raised cap', async () => {
  const file = join(scratch, 'long-rule-recording.ndjson');
  const rules = join(scratch, 'long-rule-alerts.json');
  await writeFile(file, ndjson(Array.from({ length: 10_001 }, (_, index) => sample(index * 1000))));
  await writeFile(rules, '[]');
  const args = [
    join(root, 'runtime/phargus.mjs'),
    'rules',
    '--project',
    project,
    '--file',
    file,
    '--mode',
    'alerts',
    '--rules',
    rules,
    '--window-ms',
    '10000',
  ];
  const limited = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(limited.status, 1, limited.stderr);
  assert.match(JSON.parse(limited.stderr).error.message, /valid, untruncated input/);
  const raised = spawnSync(process.execPath, [...args, '--max-events', '10001'], {
    encoding: 'utf8',
  });
  assert.equal(raised.status, 0, raised.stderr);
  const result = JSON.parse(raised.stdout);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.ok, true);
  assert.equal(result.windows, 1001);
  assert.deepEqual(result.alerts, []);
});

test('sandbox replay executes function bodies and reports missing isolated-vm as failure', async () => {
  const file = join(scratch, 'sandbox.ndjson');
  await writeFile(file, ndjson([window(0)]));
  const rules = join(scratch, 'rules');
  await import('node:fs/promises').then((fs) => fs.mkdir(rules));
  await writeFile(
    join(rules, 'lag.js'),
    "return windows.map(w => ({windowStart:w.start, message:'fixture'}));",
  );
  const result = await replayRules({ project, file, mode: 'sandbox', rules });
  assert(result.ok);
  assert(result.results);
  assert.deepEqual(result.results.lag, {
    ok: true,
    findings: [{ windowStart: 0, message: 'fixture' }],
  });
  const peer = join(project, 'node_modules', 'isolated-vm');
  await rename(peer, peer + '.disabled');
  try {
    const failure = await replayRules({ project, file, mode: 'sandbox', rules });
    assert.equal(failure.ok, false);
    assert(failure.results);
    assert.equal(failure.results.lag.ok, false);
    const child = spawn(process.execPath, [
      join(root, 'runtime/phargus.mjs'),
      'rules',
      '--project',
      project,
      '--file',
      file,
      '--mode',
      'sandbox',
      '--rules',
      rules,
    ]);
    const code = await new Promise((resolve) => child.once('exit', resolve));
    assert.equal(code, 1);
  } finally {
    await rename(peer + '.disabled', peer);
  }
});

test('a copied standalone skill uses the application package, not checkout dependencies', async () => {
  const copied = join(scratch, 'standalone');
  await cp(join(pluginPath, 'skills/phargus-memory'), copied, { recursive: true });
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [join(copied, 'scripts/phargus.mjs'), 'doctor', '--project', project],
      { cwd: scratch, encoding: 'utf8' },
    ),
  );
  assert.equal(result.command, 'doctor');
  assert.equal(result.project, project);
});

test('actual dashboard retention keeps old spans separate from recent runtime metrics', async () => {
  const upstream = await resolvePhargus(project);
  const { createCollector } = /** @type {import('../../runtime/types.js').CollectorModule} */ (
    /** @type {unknown} */ (upstream.load('collector', ['createCollector']))
  );
  const { createDashboardServer } =
    /** @type {import('../../runtime/types.js').DashboardModule} */ (
      /** @type {unknown} */ (upstream.load('dashboard', ['createDashboardServer']))
    );
  const collector = createCollector({ windowMs: 1000, capacity: 2 });
  async function* records() {
    yield span(0, 1_000_000_000);
    for (const timestamp of [100_000, 101_000, 102_000, 103_000, 104_000]) yield sample(timestamp);
  }
  let dashboard;
  try {
    await collector.consume(records());
    dashboard = await createDashboardServer({ collector, host: '127.0.0.1', port: 0 });
    const captured = await capture({
      url: dashboard.url + '/events',
      out: join(scratch, 'retained-history'),
      durationMs: 100,
    });
    const summary = await summarizeFile(captured.eventsPath, { manifest: captured.manifestPath });
    assert.deepEqual(summary.period, { startMs: 103_000, endMs: 105_000, durationMs: 2000 });
    assert.equal(summary.counts.windows, 2);
    assert.equal(summary.counts.spans, 1);
    assert.equal(summary.requests.inPeriod, 0);
    assert.equal(summary.requests.outsidePeriod, 1);
    assert.deepEqual(summary.requests.period, { startMs: 0, endMs: 1000, durationMs: 1000 });
    assert.equal(summary.metrics.observedRequestP99Ns, null);
    assert.equal(summary.metrics.observedRequestRatePerSecond, 0);
    assert.equal(summary.quality.loss.known, false);
  } finally {
    await dashboard?.close();
    await collector.close();
  }
});

test('collect delivers alerts to a file sink and refuses stdout sinks', async () => {
  const file = join(scratch, 'collect-sinks.ndjson');
  const start = Math.floor(Date.now() / 1000) * 1000 - 10_000;
  const lag = { min: 1, max: 80_000_000, mean: 10_000_000, p50: 5_000_000, p99: 70_000_000 };
  await writeFile(
    file,
    ndjson([sample(start, { eventLoop: lag }), sample(start + 1000, { eventLoop: lag })]),
  );
  const rules = join(scratch, 'collect-sinks-alerts.json');
  await writeFile(
    rules,
    JSON.stringify([
      { id: 'lag', metric: 'eventLoop.max', comparison: '>', threshold: 50_000_000, forWindows: 1 },
    ]),
  );
  const delivered = join(scratch, 'delivered-alerts.ndjson');
  const sinks = join(scratch, 'sinks.json');
  await writeFile(sinks, JSON.stringify([{ type: 'file', name: 'ops', path: delivered }]));
  const result = await collect({ project, file, durationMs: 200, port: 0, alerts: rules, sinks });
  assert.equal(result.alerts, 1);
  assert.deepEqual(result.sinks, [{ type: 'file', name: 'ops' }]);
  assert.equal(result.sinkErrors, 0);
  assert(!JSON.stringify(result).includes(delivered), 'sink paths are not echoed');
  const lines = (await readFile(delivered, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].ruleId, 'lag');
  assert.equal(lines[0].state, 'firing');
  await writeFile(sinks, JSON.stringify([{ type: 'stdout' }]));
  await assert.rejects(
    collect({ project, file, durationMs: 50, port: 0, alerts: rules, sinks }),
    /file or webhook/,
  );
});

test('collect answers proxy host names only when listed with --allowed-host', async () => {
  const file = join(scratch, 'collect-hosts.ndjson');
  await writeFile(file, ndjson([sample(Date.now())]));
  /** @param {string} url @param {string} host @returns {Promise<number>} */
  const status = (url, host) =>
    new Promise((resolve, reject) => {
      const target = new URL('/events', url);
      const request = httpRequest(
        { host: target.hostname, port: target.port, path: target.pathname, headers: { host } },
        (response) => {
          resolve(response.statusCode ?? 0);
          response.destroy();
        },
      );
      request.once('error', reject);
      request.end();
    });
  for (const allowed of [false, true]) {
    const port = await new Promise((resolve, reject) => {
      const probe = createNetServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = /** @type {import('node:net').AddressInfo} */ (probe.address());
        probe.close(() => resolve(address.port));
      });
    });
    const run = collect({
      project,
      file,
      durationMs: 600,
      port: /** @type {number} */ (port),
      ...(allowed ? { allowedHosts: ['phargus.internal'] } : {}),
    });
    await sleep(200);
    assert.equal(await status('http://127.0.0.1:' + port, 'phargus.internal'), allowed ? 200 : 421);
    const result = await run;
    assert.deepEqual(result.allowedHosts, allowed ? ['phargus.internal'] : []);
  }
});

// A whole second two minutes ago, so every fixture sample lies in the past.
const past = () => Math.floor(Date.now() / 1000) * 1000 - 120_000;
const quietLag = { min: 1, max: 5_000_000, mean: 1_000_000, p50: 1_000_000, p99: 4_000_000 };
const hotLag = { min: 1, max: 80_000_000, mean: 10_000_000, p50: 5_000_000, p99: 70_000_000 };

test('collect reports the gap and loss of a lossy recording as summarize does', async () => {
  const start = past() - 60_000;
  // Ten samples 1000 ms apart, a 58 s hole, ten more. Dropped counters rise by 20/200, reset
  // to 5/50, then rise by 17/170: 42 samples and 420 spans lost, one reset.
  const stamps = [];
  for (let i = 1; i <= 10; i += 1) stamps.push(start + i * 1000);
  for (let i = 0; i < 10; i += 1) stamps.push(start + 68_000 + i * 1000);
  const dropped = [10, 12, 15, 20, 24, 27, 30, 30, 30, 30, 5, 5, 8, 10, 12, 15, 18, 20, 22, 22];
  const file = join(scratch, 'collect-lossy.ndjson');
  await writeFile(
    file,
    ndjson(
      stamps.map((timestamp, index) =>
        sample(timestamp, {
          eventLoop: quietLag,
          dropped: { samples: dropped[index], spans: dropped[index] * 10 },
        }),
      ),
    ),
  );
  const summarized = await summarizeFile(file);
  assert.equal(summarized.quality.gaps, 1);
  assert.deepEqual(summarized.quality.loss.delta, { samples: 42, spans: 420 });
  assert.equal(summarized.quality.loss.resets, 1);
  for (const follow of [false, true]) {
    const result = await collect({ project, file, follow, durationMs: 1000, port: 0 });
    assert.equal(result.quality.gaps, 1, 'follow=' + follow);
    assert.deepEqual(result.quality.loss, summarized.quality.loss, 'follow=' + follow);
  }
});

test('rules reports the hole a forWindows alert spans without changing the alerts', async () => {
  const file = join(scratch, 'rules-gap.ndjson');
  await writeFile(
    file,
    ndjson([
      window(1_700_000_000_000, 100_000_000),
      window(1_700_003_600_000, 100_000_000),
      window(1_700_003_601_000, 10_000_000),
    ]),
  );
  const rules = join(scratch, 'rules-gap-alerts.json');
  await writeFile(
    rules,
    JSON.stringify([
      { id: 'lag', metric: 'eventLoop.max', comparison: '>', threshold: 50_000_000, forWindows: 2 },
    ]),
  );
  const alerts = await replayRules({ project, file, mode: 'alerts', rules });
  assert.deepEqual(
    alerts.alerts?.map((alert) => [alert.state, alert.windowStart]),
    [
      ['firing', 1_700_003_600_000],
      ['resolved', 1_700_003_601_000],
    ],
  );
  const directory = join(scratch, 'rules-gap-sandbox');
  await mkdir(directory);
  await writeFile(
    join(directory, 'all.js'),
    "return windows.map(w => ({windowStart:w.start, message:'w'}));",
  );
  const sandbox = await replayRules({ project, file, mode: 'sandbox', rules: directory });
  assert.equal(sandbox.ok, true);
  for (const result of [alerts, sandbox]) {
    assert.equal(result.quality.gaps, 1, result.mode);
    assert.equal(result.quality.invalidRecords, 0, result.mode);
    assert.equal(result.quality.truncated, false, result.mode);
    // Window records carry no dropped counters, so loss stays unknown.
    assert.equal(result.quality.loss.known, false, result.mode);
  }
});

test('collect and rules judge a 5000 ms recording at --interval-ms 5000 without gaps', async () => {
  const start = past() - 60_000;
  const file = join(scratch, 'interval-5000.ndjson');
  const samples = Array.from({ length: 12 }, (_, i) =>
    sample(start + (i + 1) * 5000, { eventLoop: quietLag }),
  );
  await writeFile(file, ndjson(samples));
  const rules = join(scratch, 'interval-5000-alerts.json');
  await writeFile(rules, '[]');
  const cli = join(root, 'runtime/phargus.mjs');
  const common = ['--project', project, '--file', file, '--interval-ms', '5000'];
  for (const args of [
    ['collect', ...common, '--duration-ms', '1000', '--port', '0'],
    ['rules', ...common, '--mode', 'alerts', '--rules', rules],
  ]) {
    const run = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(JSON.parse(run.stdout).quality.gaps, 0, args[0]);
  }
});

test('a clean recording keeps collect and rules results, and rules adds a clean quality block', async () => {
  const base = past();
  const records = [];
  for (let i = 1; i <= 10; i += 1)
    records.push(sample(base + i * 1000, { eventLoop: i >= 6 && i <= 8 ? hotLag : quietLag }));
  for (let i = 0; i < 5; i += 1) records.push(span(base + 1000 + i * 100));
  const file = join(scratch, 'clean-1000.ndjson');
  await writeFile(file, ndjson(records));
  const rules = join(scratch, 'clean-1000-alerts.json');
  await writeFile(
    rules,
    JSON.stringify([
      { id: 'lag', metric: 'eventLoop.max', comparison: '>', threshold: 50_000_000, forWindows: 2 },
    ]),
  );
  const collected = await collect({ project, file, durationMs: 1000, port: 0, alerts: rules });
  assert.deepEqual(
    [collected.windows, collected.spans, collected.alerts, collected.quality.gaps],
    [10, 5, 2, 0],
  );
  const alert = { ruleId: 'lag', metric: 'eventLoop.max', comparison: '>', threshold: 50_000_000 };
  const replayed = await replayRules({ project, file, mode: 'alerts', rules });
  assert.equal(replayed.windows, 10);
  assert.deepEqual(replayed.alerts, [
    {
      ...alert,
      observed: 80_000_000,
      windowStart: base + 7000,
      windowEnd: base + 8000,
      state: 'firing',
    },
    {
      ...alert,
      observed: 5_000_000,
      windowStart: base + 9000,
      windowEnd: base + 10_000,
      state: 'resolved',
    },
  ]);
  assert.equal(replayed.quality.gaps, 0);
  assert.equal(replayed.quality.stalledSamples, 0);
  assert.deepEqual(replayed.quality.loss, {
    known: true,
    initial: { samples: 0, spans: 0 },
    delta: { samples: 0, spans: 0 },
    resets: 0,
  });
});
