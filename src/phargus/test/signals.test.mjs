import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { sample, window } from './fixtures.mjs';

const cli = fileURLToPath(new URL('../runtime/phargus.mjs', import.meta.url));
const skip = process.platform === 'win32' && 'POSIX signals and FIFOs only';
// Reports the signal listeners left when the process exits, after the command has returned.
const listenerProbe =
  'data:text/javascript,' +
  encodeURIComponent(
    'process.on("exit", () => process.stderr.write(JSON.stringify({ listeners: ' +
      '[process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")] }) + "\\n"));',
  );

/** @type {{child: import('node:child_process').ChildProcess, handles: import('node:fs/promises').FileHandle[]}[]} */
const running = [];
let scratch = '';
test.before(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'phargus-signals-'));
});
// A failed assertion never leaves a child or a FIFO end behind.
test.afterEach(async () => {
  for (const { child, handles } of running.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    for (const handle of handles) await handle.close().catch(() => undefined);
  }
});
test.after(async () => {
  await rm(scratch, { recursive: true, force: true });
});

/** @param {string[]} args @param {string[]} [execArgv] */
function phargus(args, execArgv = []) {
  const child = spawn(process.execPath, [...execArgv, cli, ...args]);
  /** @type {import('node:fs/promises').FileHandle[]} */
  const handles = [];
  running.push({ child, handles });
  const output = { stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => (output.stdout += chunk));
  child.stderr.on('data', (chunk) => (output.stderr += chunk));
  /** @type {Promise<{code: number | null, signal: NodeJS.Signals | null}>} */
  const ended = new Promise((resolve) =>
    child.once('close', (code, signal) => resolve({ code, signal })),
  );
  return { child, handles, output, ended };
}

/** @param {() => boolean | Promise<boolean>} check @param {string} what */
async function until(check, what) {
  const deadline = Date.now() + 10_000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('timed out waiting for ' + what);
    await sleep(20);
  }
}

/** @param {string} name */
function fifo(name) {
  const path = join(scratch, name);
  execFileSync('mkfifo', [path]);
  return path;
}

/**
 * Opens a FIFO's write end once the child has opened its read end: a non-blocking open fails
 * with ENXIO until then, so it is the readiness signal, never a fixed sleep.
 * @param {string} path @param {{handles: import('node:fs/promises').FileHandle[]}} run
 */
async function openWriter(path, run) {
  /** @type {import('node:fs/promises').FileHandle | undefined} */
  let handle;
  await until(async () => {
    handle = await open(path, constants.O_WRONLY | constants.O_NONBLOCK).catch((error) => {
      if (error.code !== 'ENXIO') throw error;
      return undefined;
    });
    return handle !== undefined;
  }, 'a reader on ' + path);
  run.handles.push(/** @type {import('node:fs/promises').FileHandle} */ (handle));
  return /** @type {import('node:fs/promises').FileHandle} */ (handle);
}

/** @param {string} path */
async function holdsLine(path) {
  return (await readFile(path, 'utf8').catch(() => '')).includes('\n');
}

/** @param {string} out */
async function interruptedManifest(out) {
  const manifestPath = join(out, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.termination, 'interrupted');
  assert.equal(manifest.quality.truncated, true);
  const summary = spawnSync(
    process.execPath,
    [cli, 'summarize', '--file', join(out, 'events.ndjson'), '--manifest', manifestPath],
    { encoding: 'utf8' },
  );
  assert.equal(summary.status, 0, summary.stderr);
  assert.equal(JSON.parse(summary.stdout).quality.truncated, true);
}

test('a signal ends summarize at once with no result', { skip }, async () => {
  for (const signal of /** @type {const} */ (['SIGTERM', 'SIGINT'])) {
    const input = fifo('summarize-' + signal + '.fifo');
    const run = phargus(['summarize', '--file', input]);
    // The open write end keeps the read blocked: only the signal can end the command.
    await openWriter(input, run);
    run.child.kill(signal);
    assert.deepEqual(await run.ended, { code: null, signal });
    assert.equal(run.output.stdout, '');
  }
});

test('SIGTERM stops capture --file with a manifest that summarize reads', { skip }, async () => {
  const input = fifo('capture.fifo');
  const out = join(scratch, 'file-capture');
  const run = phargus(['capture', '--file', input, '--out', out], ['--import', listenerProbe]);
  const writer = await openWriter(input, run);
  await writer.write(JSON.stringify(sample(Date.now())) + '\n');
  await until(() => holdsLine(join(out, 'events.ndjson')), 'the captured event');
  run.child.kill('SIGTERM');
  // The writer stays open and silent, so the manifest proves the signal stopped the record loop.
  await until(() => run.output.stdout.includes('"manifestPath"'), 'the capture result');
  // A pending FIFO read cannot be cancelled: the process exits once the writer closes.
  await writer.close();
  const ending = await run.ended;
  assert.equal(ending.code, 0, run.output.stderr);
  assert.equal(JSON.parse(run.output.stdout).manifest.termination, 'interrupted');
  assert.match(run.output.stderr, /\{"listeners":\[0,0\]\}/);
  await interruptedManifest(out);
});

test('SIGTERM stops capture --url with an interrupted manifest', { skip }, async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.write('event: window\ndata: ' + JSON.stringify(window(Date.now())) + '\n\n');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  try {
    const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
    const out = join(scratch, 'url-capture');
    const run = phargus(['capture', '--url', 'http://127.0.0.1:' + port + '/', '--out', out]);
    await until(() => holdsLine(join(out, 'events.ndjson')), 'the captured event');
    run.child.kill('SIGTERM');
    const ending = await run.ended;
    assert.equal(ending.code, 0, run.output.stderr);
    await interruptedManifest(out);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
});

test('an interrupted capture --file with no events leaves no files', { skip }, async () => {
  const input = fifo('empty.fifo');
  const out = join(scratch, 'empty-capture');
  const run = phargus(['capture', '--file', input, '--out', out]);
  const writer = await openWriter(input, run);
  run.child.kill('SIGTERM');
  await until(() => run.output.stderr.includes('no valid Phargus events'), 'the capture error');
  await writer.close();
  assert.equal((await run.ended).code, 1);
  await assert.rejects(access(join(out, 'events.ndjson')), { code: 'ENOENT' });
  await assert.rejects(access(join(out, 'manifest.json')), { code: 'ENOENT' });
});
