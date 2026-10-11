import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { readFile, writeFile, rename, mkdtemp, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { root, pluginPath } from '../../scripts/generate.mjs';
import { capture } from '../../runtime/capture.mjs';
import { collect, heap, replayRules } from '../../runtime/operations.mjs';
import { doctor, resolveArgus } from '../../runtime/upstream.mjs';
import { sample, span, window, ndjson } from '../fixtures.mjs';
import { fileEvents, quality } from '../../runtime/records.mjs';
import { summarizeFile } from '../../runtime/summary.mjs';

const prepared = JSON.parse(await readFile(join(root, '.cache/integration.json'), 'utf8'));
const project = prepared.project;
const scratch = await mkdtemp(join(tmpdir(), 'argus-integration-'));
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
  assert.equal(result.package.version, '0.0.1');
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
  const configPath = join(project, 'argus.config.json');
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
      [format === 'cjs' ? '--require' : '--import', 'argus/agent', app],
      {
        cwd: project,
        env: { ...process.env, ARGUS_OUTPUT: file, ARGUS_INTERVAL_MS: '50' },
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
    const upstream = await resolveArgus(project);
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

test('file and live collection reject corrupt Argus records even when logs are allowed', async () => {
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
      'class ArgusAiRetainedMarker {} globalThis.retained = Array.from({length:' +
        count +
        '},()=>new ArgusAiRetainedMarker()); require("node:v8").writeHeapSnapshot(' +
        JSON.stringify(path) +
        ');',
    ]);
  const summarized = await heap({ project, file: before });
  assert.equal(summarized.mode, 'summary');
  assert(summarized.result);
  const diff = await heap({ project, before, after });
  const result = /** @type {{entries: {name: string, countDelta: number}[]}} */ (diff.result);
  assert(
    result.entries.some((entry) => entry.name === 'ArgusAiRetainedMarker' && entry.countDelta > 0),
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
    join(root, 'runtime/argus.mjs'),
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
      join(root, 'runtime/argus.mjs'),
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
  await cp(join(pluginPath, 'skills/argus-memory'), copied, { recursive: true });
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [join(copied, 'scripts/argus.mjs'), 'doctor', '--project', project],
      { cwd: scratch, encoding: 'utf8' },
    ),
  );
  assert.equal(result.command, 'doctor');
  assert.equal(result.project, project);
});

test('actual dashboard retention keeps old spans separate from recent runtime metrics', async () => {
  const upstream = await resolveArgus(project);
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
      ...(allowed ? { allowedHosts: ['argus.internal'] } : {}),
    });
    await sleep(200);
    assert.equal(await status('http://127.0.0.1:' + port, 'argus.internal'), allowed ? 200 : 421);
    const result = await run;
    assert.deepEqual(result.allowedHosts, allowed ? ['argus.internal'] : []);
  }
});
