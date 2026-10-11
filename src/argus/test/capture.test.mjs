import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { capture } from '../runtime/capture.mjs';
import { summarizeFile } from '../runtime/summary.mjs';
import { window } from './fixtures.mjs';

/** @param {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void} handler @param {(url: string, dir: string) => Promise<void>} run */
async function withServer(handler, run) {
  const directory = await mkdtemp(join(tmpdir(), 'argus-sse-'));
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  try {
    await run('http://127.0.0.1:' + address.port + '/events', directory);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(() => resolve(undefined)));
    await rm(directory, { recursive: true, force: true });
  }
}

test('captures chunked events, comments, history and live data with bearer auth', async () => {
  await withServer(
    (req, res) => {
      assert.equal(req.headers.authorization, 'Bearer fixture-secret');
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const history = 'event: window\ndata: ' + JSON.stringify(window(Date.now() - 5000)) + '\n\n';
      res.write(history.slice(0, 20));
      res.write(history.slice(20));
      res.write(
        ':heartbeat\n\nevent: window\ndata: ' + JSON.stringify(window(Date.now())) + '\n\n',
      );
    },
    async (url, directory) => {
      const result = await capture({
        url: url + '?private=fixture-secret',
        out: directory,
        durationMs: 100,
        token: 'fixture-secret',
      });
      assert.equal(result.manifest.events, 2);
      assert.equal(result.manifest.historyEvents, 1);
      assert.equal(result.manifest.observedEvents, 1);
      assert.equal(result.manifest.termination, 'duration');
      assert.equal(result.manifest.quality.loss.known, false);
      assert(!(await readFile(result.manifestPath, 'utf8')).includes('fixture-secret'));
      const summary = await summarizeFile(result.eventsPath, { manifest: result.manifestPath });
      assert.equal(summary.counts.windows, 2);
      assert.equal(summary.quality.loss.known, false);
      await assert.rejects(capture({ url, out: directory, durationMs: 10 }), /EEXIST/);
    },
  );
});

test('marks limits and malformed payloads explicitly', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(
        'event: window\ndata: invalid\n\nevent: window\ndata: ' +
          JSON.stringify(window(0)) +
          '\n\n',
      );
    },
    async (url, directory) => {
      const result = await capture({ url, out: directory, maxEvents: 1, durationMs: 100 });
      assert.equal(result.manifest.termination, 'limit');
      assert.equal(result.manifest.quality.truncated, true);
      assert.equal(result.manifest.quality.invalidRecords, 1);
    },
  );
});

test('fails on authentication errors and preserves an error manifest', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(401);
      res.end();
    },
    async (url, directory) => {
      await assert.rejects(capture({ url, out: directory, durationMs: 100 }), /HTTP 401/);
      const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      assert.equal(manifest.termination, 'error');
    },
  );
});

test('fails on early disconnect and wrong content type, and rejects redirects', async () => {
  for (const scenario of ['disconnect', 'content-type', 'redirect']) {
    await withServer(
      (_req, res) => {
        if (scenario === 'redirect') {
          res.writeHead(302, { location: '/other' });
          res.end();
        } else {
          res.writeHead(200, {
            'content-type': scenario === 'content-type' ? 'application/json' : 'text/event-stream',
          });
          res.end('event: window\ndata: ' + JSON.stringify(window(0)) + '\n\n');
        }
      },
      async (url, directory) => {
        await assert.rejects(capture({ url, out: directory, durationMs: 100 }));
      },
    );
  }
});

test('reports no events after a heartbeat-only observation', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(':heartbeat\n\n');
    },
    async (url, directory) => {
      await assert.rejects(capture({ url, out: directory, durationMs: 40 }), /no valid/);
    },
  );
});

test('invalid bearer values fail without disclosing the credential', async () => {
  await assert.rejects(
    capture({ url: 'http://127.0.0.1:1/events', out: '/unused', token: 'private-value\nsecret' }),
    (error) => {
      assert(error instanceof Error);
      assert(!error.message.includes('private-value'));
      assert(!error.message.includes('secret'));
      return true;
    },
  );
});
