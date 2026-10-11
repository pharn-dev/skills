import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { root, catalog, pluginPath } from '../scripts/generate.mjs';
import { sample, span, window, ndjson, conditions } from '../test/fixtures.mjs';
import { capture } from '../runtime/capture.mjs';
import { resolveArgus } from '../runtime/upstream.mjs';
import { object } from '../runtime/records.mjs';

const { values } = parseArgs({
  options: {
    client: { type: 'string', default: 'both' },
    case: { type: 'string' },
    out: { type: 'string' },
    'timeout-ms': { type: 'string', default: '180000' },
    'clean-codex': { type: 'boolean', default: false },
  },
});
const clients = values.client === 'both' ? ['codex', 'claude'] : [values.client];
if (clients.some((name) => !['codex', 'claude'].includes(name)))
  throw new Error('--client must be codex, claude or both');
/** @type {{id: string, skill: string, prompt: string, verdict: string, acceptableVerdicts?: string[]}[]} */
const cases = JSON.parse(await readFile(join(root, 'evals/cases.json'), 'utf8'));
const selected = values.case ? cases.filter((c) => c.id === values.case) : cases;
if (!selected.length) throw new Error('unknown case');
const timeoutMs = Number(values['timeout-ms']);
if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('invalid timeout');
const prepared = JSON.parse(await readFile(join(root, '.cache/integration.json'), 'utf8'));
const output = resolve(
  values.out ?? join(root, 'evals/results', new Date().toISOString().replace(/[:.]/g, '-')),
);
await mkdir(output, { recursive: true });
const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    workflow: { type: 'string', enum: [...new Set(cases.map((scenario) => scenario.skill))] },
    verdict: {
      type: 'string',
      enum: ['connected', 'hypotheses', 'inconclusive', 'memory-pressure', 'replayed'],
    },
    observations: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
    nextExperiment: { type: 'string' },
    artifacts: { type: 'array', items: { type: 'string' } },
  },
  required: ['workflow', 'verdict', 'observations', 'limitations', 'nextExperiment', 'artifacts'],
};
/** @type {Record<string, unknown>[]} */ const results = [];

/** @param {string} path @param {unknown} data */
async function json(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

/** @param {string} project @param {string} id */
async function fixtures(project, id) {
  const points = [0, 1000, 2000, 3000, 4000, 5000];
  const raw = points.map((time) => sample(time));
  if (id === 'missing') await writeFile(join(project, 'input.ndjson'), '');
  else if (id === 'memory')
    await writeFile(
      join(project, 'input.ndjson'),
      ndjson(
        points.map((time, index) =>
          sample(time, {
            memory: {
              heapUsed: 1_048_576,
              heapTotal: 4_194_304,
              rss: 20_971_520 + index * 10_485_760,
              external: 2_097_152 + index * 10_485_760,
              arrayBuffers: 1_048_576 + index * 10_485_760,
            },
          }),
        ),
      ),
    );
  else if (id === 'percentile')
    await writeFile(
      join(project, 'input.ndjson'),
      ndjson([
        sample(0, {
          eventLoop: {
            min: 1,
            max: 100_000_000,
            mean: 10_000_000,
            p50: 5_000_000,
            p99: 10_000_000,
          },
        }),
        sample(1000, {
          eventLoop: {
            min: 1,
            max: 100_000_000,
            mean: 30_000_000,
            p50: 20_000_000,
            p99: 90_000_000,
          },
        }),
      ]),
    );
  else
    await writeFile(
      join(project, 'input.ndjson'),
      ndjson([
        ...raw,
        ...points.map((time) =>
          span(time, time >= 2000 && time <= 4000 ? 400_000_000 : 10_000_000),
        ),
      ]),
    );
  if (id === 'verify') {
    const input = join(project, 'input.ndjson');
    for (const name of ['before', 'after']) {
      const conditionFile = join(project, name + '-conditions.json');
      await json(conditionFile, { ...conditions, requests: name === 'before' ? 100 : 60 });
      await capture({ file: input, out: join(project, name), conditions: conditionFile });
    }
  }
  if (id === 'rules') {
    await writeFile(
      join(project, 'incident.ndjson'),
      ndjson([10, 50, 60, 70, 10].map((lag, index) => window(index * 1000, lag * 1_000_000))),
    );
    await writeFile(
      join(project, 'normal.ndjson'),
      ndjson([10, 20, 30].map((lag, index) => window(index * 1000, lag * 1_000_000))),
    );
  }
  if (id === 'setup') {
    await writeFile(
      join(project, 'app.cjs'),
      "const http=require('node:http');const server=http.createServer((req,res)=>res.end('ok'));server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port})));process.on('SIGTERM',()=>server.close());setTimeout(()=>server.close(),30000).unref();\n",
    );
    const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
    pkg.scripts = { start: 'node app.cjs' };
    await json(join(project, 'package.json'), pkg);
  }
  if (id === 'sse') {
    const upstream = await resolveArgus(project);
    const api = /** @type {import('../runtime/types.js').CollectorModule} */ (
      /** @type {unknown} */ (upstream.load('collector', ['createCollector']))
    );
    const dashboardApi = /** @type {import('../runtime/types.js').DashboardModule} */ (
      /** @type {unknown} */ (upstream.load('dashboard', ['createDashboardServer']))
    );
    const collector = api.createCollector({ windowMs: 1000, capacity: 20 });
    async function* records() {
      for (const point of raw) yield point;
    }
    await collector.consume(records());
    const dashboard = await dashboardApi.createDashboardServer({
      collector,
      host: '127.0.0.1',
      port: 0,
    });
    await json(join(project, 'endpoint.json'), { url: dashboard.url + '/events' });
    return async () => {
      await dashboard.close();
      await collector.close();
    };
  }
  return async () => {};
}

/** @param {unknown} value @param {string[]} commands */
function findCommands(value, commands) {
  if (Array.isArray(value)) {
    for (const child of value) findCommands(child, commands);
  } else if (object(value)) {
    if (value.type === 'command_execution' && typeof value.command === 'string')
      commands.push(value.command);
    if (
      value.type === 'tool_use' &&
      value.name === 'Bash' &&
      object(value.input) &&
      typeof value.input.command === 'string'
    )
      commands.push(value.input.command);
    for (const child of Object.values(value)) findCommands(child, commands);
  }
}

/** @param {string} client @param {string} project @param {string} prompt @param {string} resultDir */
async function execute(client, project, prompt, resultDir) {
  const finalPath = join(resultDir, 'final.json');
  const schemaPath = join(project, '.eval-output-schema.json');
  await json(schemaPath, schema);
  const args =
    client === 'codex'
      ? [
          '-a',
          'never',
          'exec',
          '--ephemeral',
          '--skip-git-repo-check',
          '-s',
          'workspace-write',
          '-c',
          'sandbox_workspace_write.network_access=true',
          '-C',
          project,
          '--json',
          '--output-schema',
          schemaPath,
          '--output-last-message',
          finalPath,
          '-',
        ]
      : [
          '-p',
          '--no-session-persistence',
          '--output-format',
          'stream-json',
          '--verbose',
          '--json-schema',
          JSON.stringify(schema),
          '--permission-mode',
          'acceptEdits',
          '--allowedTools',
          [
            'Read',
            'Write',
            'Edit',
            'Bash(node *)',
            'Bash(' + process.execPath + ' *)',
            // Inspection and file layout.
            'Bash(ls *)',
            'Bash(cat *)',
            'Bash(head *)',
            'Bash(tail *)',
            'Bash(wc *)',
            'Bash(grep *)',
            'Bash(pwd)',
            'Bash(mkdir *)',
            'Bash(cp *)',
            'Bash(sed *)',
            'Bash(printf *)',
            'Bash(echo *)',
            // Starting, exercising and stopping the temporary application in the setup case.
            // Codex gets the same through its workspace-write sandbox with network access.
            'Bash(npm *)',
            'Bash(sh *)',
            'Bash(bash *)',
            'Bash(export *)',
            'Bash(env *)',
            'Bash(nohup *)',
            'Bash(sleep *)',
            'Bash(curl *)',
            'Bash(kill *)',
            'Bash(pkill *)',
            'Bash(pgrep *)',
            'Bash(rm -f .argus/*)',
          ].join(','),
          '--strict-mcp-config',
          '--mcp-config',
          '{"mcpServers":{}}',
          '--plugin-dir',
          pluginPath,
        ];
  if (client === 'codex' && values['clean-codex'])
    args.splice(3, 0, '--ignore-user-config', '--ignore-rules', '--disable', 'plugins');
  const child = spawn(client, args, {
    cwd: project,
    env: { ...process.env },
    detached: process.platform !== 'win32',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const terminate = () => {
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      /* The owned process group may have already exited. */
    }
  };
  const timer = setTimeout(() => {
    timedOut = true;
    terminate();
  }, timeoutMs);
  /** @type {number | null} */ let code;
  try {
    code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
      child.stdin.end(prompt);
    });
  } finally {
    clearTimeout(timer);
    terminate();
  }
  await writeFile(join(resultDir, 'trace.jsonl'), stdout, { mode: 0o600 });
  await writeFile(join(resultDir, 'stderr.txt'), stderr, { mode: 0o600 });
  const logs = stdout.split('\n').flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  if (client === 'claude') {
    const result = logs.findLast((entry) => entry.type === 'result');
    if (result?.structured_output) await json(finalPath, result.structured_output);
    else if (typeof result?.result === 'string') {
      try {
        await json(finalPath, JSON.parse(result.result));
      } catch {
        /* The failure is reported by the artifact gate. */
      }
    }
  }
  /** @type {string[]} */ const commands = [];
  findCommands(logs, commands);
  return { code, timedOut, commands, finalPath, diagnostics: stderr + '\n' + stdout };
}

for (const client of clients) {
  let unavailable = false;
  for (const scenario of selected) {
    if (unavailable) {
      results.push({
        client,
        case: scenario.id,
        status: 'blocked',
        reason: 'client access failed in the previous trial',
      });
      continue;
    }
    const project = await mkdtemp(join(tmpdir(), 'argus-eval-'));
    const resultDir = join(output, client + '-' + scenario.id);
    await mkdir(resultDir, { recursive: true });
    await cp(prepared.project, project, { recursive: true });
    // Codex discovers a standalone skill; Claude loads the native plugin per invocation.
    await cp(
      join(pluginPath, 'skills', scenario.skill),
      join(project, '.agents/skills', scenario.skill),
      { recursive: true },
    );
    /** @type {() => Promise<void>} */ let cleanup = async () => {};
    const invocation =
      client === 'codex' ? '$' + scenario.skill : '/' + catalog.name + ':' + scenario.skill;
    const prompt =
      'Use ' +
      invocation +
      ' to perform this local acceptance trial. The application directory is ' +
      project +
      '. Use the verified Node binary ' +
      process.execPath +
      ' if the shell selects an older Node.\n' +
      scenario.prompt +
      '\nUse the bundled Node tools, preserve actual JSON outputs in the named artifacts, and return the requested structured final response. Keep all work inside this temporary application. Do not publish, contact others, or access production.\n';
    await writeFile(join(resultDir, 'prompt.txt'), prompt);
    process.stdout.write(client + ' / ' + scenario.id + ': running\n');
    try {
      // A fixture failure is recorded as a failed trial instead of aborting the whole run.
      cleanup = await fixtures(project, scenario.id);
      const executed = await execute(client, project, prompt, resultDir);
      if (executed.code !== 0 || executed.timedOut)
        throw new Error(
          executed.timedOut ? 'client trial timed out' : 'client exited ' + executed.code,
        );
      assert(
        executed.commands.some((command) => command.includes('argus.mjs')),
        'no bundled helper execution in tool trace',
      );
      const final = JSON.parse(await readFile(executed.finalPath, 'utf8'));
      assert.equal(final.workflow, scenario.skill);
      assert(
        (scenario.acceptableVerdicts ?? [scenario.verdict]).includes(final.verdict),
        'verdict contradicts the case rubric',
      );
      assert(Array.isArray(final.limitations));
      const tool = JSON.parse(await readFile(join(project, 'tool-result.json'), 'utf8'));
      assert.equal(tool.schemaVersion, 1);
      if (scenario.id === 'setup') {
        assert(tool.counts.windows > 0);
        assert(tool.counts.spans > 0);
        await readFile(join(project, '.argus/tools/argus.mjs'));
      }
      if (scenario.id === 'verify') {
        assert.equal(tool.comparable, false);
        assert(tool.reasons.includes('different condition: requests'));
      }
      if (scenario.id === 'memory') {
        assert.equal(tool.memory.first.heapUsed, tool.memory.last.heapUsed);
        assert(tool.memory.last.external > tool.memory.first.external);
      }
      if (scenario.id === 'missing')
        assert.equal(tool.counts.samples + tool.counts.windows + tool.counts.spans, 0);
      if (scenario.id === 'sse') {
        assert.equal(tool.quality.loss.known, false);
        assert.equal(tool.metrics.externalMaxBytes, null);
        assert.deepEqual(tool.hotspots, []);
      }
      if (scenario.id === 'percentile') {
        assert.equal(tool.metrics.eventLoopMaxNs, 100_000_000);
        assert.equal(tool.metrics.maxSampleP99Ns, 90_000_000);
      }
      if (scenario.id === 'rules') {
        assert.deepEqual(
          tool.alerts.map((/** @type {{state: string, windowStart: number}} */ alert) => [
            alert.state,
            alert.windowStart,
          ]),
          [
            ['firing', 3000],
            ['resolved', 4000],
          ],
        );
        const normal = JSON.parse(await readFile(join(project, 'normal-result.json'), 'utf8'));
        assert.deepEqual(normal.alerts, []);
      }
      await cp(join(project, 'tool-result.json'), join(resultDir, 'tool-result.json'));
      if (scenario.id === 'rules')
        await cp(join(project, 'alerts.json'), join(resultDir, 'alerts.json'));
      results.push({
        client,
        case: scenario.id,
        status: 'passed-automatic',
        semanticReview: 'pending',
        commands: executed.commands,
      });
      process.stdout.write(client + ' / ' + scenario.id + ': passed automatic checks\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      let diagnostics = '';
      try {
        diagnostics =
          (await readFile(join(resultDir, 'trace.jsonl'), 'utf8')) +
          (await readFile(join(resultDir, 'stderr.txt'), 'utf8'));
      } catch {
        /* Spawn failure may have no trace. */
      }
      unavailable =
        (/^client exited/.test(message) &&
          /model[^\n]*not supported|not logged in|invalid_api_key|api key is missing|rate_limit_exceeded|usage_limit_reached|authentication_failed/i.test(
            diagnostics,
          )) ||
        /spawn.*ENOENT/.test(message);
      results.push({
        client,
        case: scenario.id,
        status: unavailable ? 'blocked' : 'failed',
        reason: message,
        project,
      });
      process.stdout.write(
        client +
          ' / ' +
          scenario.id +
          ': ' +
          (unavailable ? 'blocked' : 'failed') +
          ' (' +
          message +
          ')\n',
      );
    } finally {
      await cleanup();
    }
    // Preserve fixture workspaces on failure for inspection, remove successful trials.
    if (results.at(-1)?.status === 'passed-automatic')
      await rm(project, { recursive: true, force: true });
    await json(join(output, 'report.json'), {
      schemaVersion: 1,
      prepared,
      models: 'client defaults',
      semanticReviewRequired: true,
      results,
    });
  }
}
await json(join(output, 'report.json'), {
  schemaVersion: 1,
  prepared,
  models: 'client defaults',
  semanticReviewRequired: true,
  results,
});
process.stdout.write('Evaluation report: ' + join(output, 'report.json') + '\n');
if (results.some((result) => result.status !== 'passed-automatic')) process.exitCode = 1;
