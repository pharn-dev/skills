import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, replayRules } from '../runtime/operations.mjs';

test('collect rejects bad --alerts and --sinks before resolving Argus or arming a timer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argus-ops-'));
  try {
    const sinks = join(directory, 'sinks.json');
    const alerts = join(directory, 'alerts.json');
    await writeFile(sinks, JSON.stringify([{ type: 'stdout' }]));
    await writeFile(alerts, '{not json');
    // The project does not exist: reaching resolveArgus would fail with a different error.
    const project = join(directory, 'missing-project');
    const base = { project, file: join(directory, 'events.ndjson'), durationMs: 600_000 };
    await assert.rejects(collect({ ...base, sinks }), /type must be file or webhook/);
    await assert.rejects(collect({ ...base, alerts }), SyntaxError);
    // A leaked 10-minute timer would keep this test file from exiting.
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('replayRules validates --mode before resolving Argus or reading input', async () => {
  await assert.rejects(
    replayRules({
      project: '/nonexistent/argus-project',
      file: '/nonexistent/events.ndjson',
      mode: 'bogus',
      rules: '/nonexistent/rules.json',
    }),
    /--mode must be alerts or sandbox/,
  );
});
