import test from 'node:test';
import assert from 'node:assert/strict';
import { leaks, redactedEvidence, redactionContext, redactJson } from '../scripts/redact.mjs';

const home = '/Users/alice';
const tmp = '/var/folders/zq/abc123/T';
const project = tmp + '/phargus-eval-Xy12Ab';
const repo = home + '/src/skills';
const secrets = {
  OPENAI_API_KEY: 'sk-proj-abcdefghijklmnopqrstuvwxyz012345',
  PHARGUS_DASHBOARD_TOKEN: 'dashboard-token-value-1234',
  SSH_AUTH_SOCK: '/private/tmp/com.apple.launchd.q1/Listeners',
};
const context = redactionContext({
  paths: [
    [project, '<project>'],
    [repo, '<repo>'],
    [home + '/.nvm/versions/node/v24.13.1/bin/node', '<node>'],
  ],
  env: { ...secrets, HOME: home, LANG: 'en_US.UTF-8' },
  home,
  tmp,
  user: 'alice',
});

test('redacts trial, repository, node, temp and home paths and the user name', () => {
  const evidence = redactJson(
    {
      artifacts: [project + '/tool-result.json', project + '/.phargus/tools/phargus.mjs'],
      observations: [
        'Ran ' + home + '/.nvm/versions/node/v24.13.1/bin/node ' + repo + '/plugins/phargus',
        'Scratch file ' + tmp + '/other/run.json and ' + home + '/notes.txt',
        'Started by alice on 127.0.0.1:7070; malice and alice_x stay',
        'Another account at /Users/bob/app and /home/carol/app and C:\\Users\\dave\\app',
        'macOS real temp path /private/var/folders/zq/abc123/T/phargus-eval-other',
      ],
      [project + '/input.ndjson']: { samples: 6 },
    },
    context,
  );
  assert.deepEqual(evidence, {
    artifacts: ['<project>/tool-result.json', '<project>/.phargus/tools/phargus.mjs'],
    observations: [
      'Ran <node> <repo>/plugins/phargus',
      'Scratch file <tmp>/other/run.json and <home>/notes.txt',
      'Started by <user> on 127.0.0.1:7070; malice and alice_x stay',
      'Another account at /Users/<user>/app and /home/<user>/app and C:\\Users\\<user>\\app',
      'macOS real temp path <tmp>/phargus-eval-other',
    ],
    '<project>/input.ndjson': { samples: 6 },
  });
});

test('redacts environment secrets, tokens and secret-named fields', () => {
  const evidence = redactJson(
    {
      commands: [
        'curl -H "Authorization: Bearer abcdefghijklmnop" http://127.0.0.1:7070/events',
        'PHARGUS_DASHBOARD_TOKEN=dashboard-token-value-1234 node phargus.mjs capture',
        'export GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123456789',
        'curl "http://127.0.0.1:7070/events?token=s3cr3t-value&limit=10"',
        'echo $OPENAI_API_KEY is sk-proj-abcdefghijklmnopqrstuvwxyz012345',
        'other key sk-ant-ABCDEFGHIJKLMNOPQRSTUVWX and AKIAABCDEFGHIJKLMNOP',
        'jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLXZhbHVl',
        'socket /private/tmp/com.apple.launchd.q1/Listeners',
      ],
      auth: { token: 'plain-secret', tokenEnv: 'PHARGUS_DASHBOARD_TOKEN', password: 'hunter22' },
      dashboard: { apiKey: 'k-123456789', token: 'PHARGUS_DASHBOARD_TOKEN', tokens: 3 },
    },
    context,
  );
  assert.deepEqual(evidence, {
    commands: [
      'curl -H "Authorization: Bearer <redacted>" http://127.0.0.1:7070/events',
      'PHARGUS_DASHBOARD_TOKEN=<redacted:PHARGUS_DASHBOARD_TOKEN> node phargus.mjs capture',
      'export GITHUB_TOKEN=<redacted>',
      'curl "http://127.0.0.1:7070/events?token=<redacted>&limit=10"',
      'echo $OPENAI_API_KEY is <redacted:OPENAI_API_KEY>',
      'other key <redacted> and <redacted>',
      'jwt <redacted>',
      'socket <redacted:SSH_AUTH_SOCK>',
    ],
    auth: { token: '<redacted>', tokenEnv: 'PHARGUS_DASHBOARD_TOKEN', password: '<redacted>' },
    dashboard: { apiKey: '<redacted>', token: 'PHARGUS_DASHBOARD_TOKEN', tokens: 3 },
  });
});

test('serialized evidence contains no literal, user name or secret and keeps measurements', () => {
  const raw = {
    workflow: 'phargus-diagnose',
    verdict: 'hypotheses',
    observations: ['p99 400 ms between 2000 and 4000 in ' + project + ' for alice'],
    limitations: ['token ' + secrets.PHARGUS_DASHBOARD_TOKEN + ' at ' + repo],
    nextExperiment: 'Rerun with ' + secrets.OPENAI_API_KEY,
    artifacts: [home + '/x.json'],
    metrics: { eventLoopMaxNs: 100_000_000, ok: true, missing: null },
  };
  const text = redactedEvidence(raw, context);
  assert.deepEqual(leaks(text, context), []);
  for (const value of [home, tmp, project, repo, 'alice', ...Object.values(secrets)])
    assert(!text.includes(value), value);
  const parsed = JSON.parse(text);
  assert.deepEqual(parsed.metrics, raw.metrics);
  assert.equal(parsed.observations[0], 'p99 400 ms between 2000 and 4000 in <project> for <user>');
  assert.equal(text, JSON.stringify(parsed, null, 2) + '\n');
});

test('leaks names what unredacted text would expose without echoing it', () => {
  const found = leaks(
    JSON.stringify({ path: project, user: 'alice', key: 'sk-abcdefghijklmnopqrstuvwx' }),
    context,
  );
  assert.deepEqual(found.sort(), ['<project>', '<tmp>', '<user>', 'secret-looking token']);
});
