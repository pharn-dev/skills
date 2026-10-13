import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluationGate } from '../scripts/eval-gate.mjs';
import {
  automaticDigest,
  emptyReport,
  evidenceDirectory,
  evidenceFiles,
  readReport,
  sha256,
  signOff,
  writeReport,
} from '../scripts/verification.mjs';

const fingerprint = 'a'.repeat(64);
const cases = ['setup', 'rules'];
const now = new Date('2026-10-13T12:00:00Z');

/**
 * A fixture checkout (repoRoot/src/phargus) with one runner-shaped run of every case in both
 * clients, each with committed evidence. Options leave chosen trials unreviewed or failed.
 * @param {{pending?: string[], failed?: string[]}} [options]
 */
async function checkout(options = {}) {
  const repoRoot = await mkdtemp(join(tmpdir(), 'phargus-gate-'));
  const root = join(repoRoot, 'src', 'phargus');
  await mkdir(join(root, 'evals'), { recursive: true });
  await writeFile(join(root, 'evals/cases.json'), JSON.stringify(cases.map((id) => ({ id }))));
  const bases = { root, repoRoot };
  const report = emptyReport();
  report.runs.push({ id: 'run-1', behaviorFingerprint: fingerprint });
  for (const client of ['codex', 'claude'])
    for (const scenario of cases) {
      const key = client + '/' + scenario;
      const directory = evidenceDirectory('run-1', client, scenario, bases);
      const evidence = [];
      for (const name of evidenceFiles) {
        const text = JSON.stringify({ client, scenario, name }, null, 2) + '\n';
        await mkdir(join(repoRoot, directory), { recursive: true });
        await writeFile(join(repoRoot, directory, name), text);
        evidence.push({ path: directory + '/' + name, sha256: sha256(text) });
      }
      const trial = {
        run: 'run-1',
        client,
        case: scenario,
        behaviorFingerprint: fingerprint,
        status: options.failed?.includes(key) ? 'failed' : 'passed-automatic',
        evidence,
        automaticDigest: '',
        semanticReview: 'pending',
        signedOffBy: null,
        signedOffAt: null,
        reviewNote: null,
      };
      trial.automaticDigest = automaticDigest(trial);
      report.trials.push(trial);
      if (!options.pending?.includes(key) && !options.failed?.includes(key))
        await signOff(report, {
          run: 'run-1',
          client,
          case: scenario,
          reviewer: '@octo-reviewer',
          decision: 'passed',
          fingerprint,
          now,
          ...bases,
        });
    }
  await writeReport(report, root);
  return { root, repoRoot, fingerprint };
}

/** @param {{root: string, repoRoot: string}} fixture @param {(report: any) => void} change */
async function edit(fixture, change) {
  const report = await readReport(fixture.root);
  change(report);
  await writeReport(report, fixture.root);
}

test('passes when every case in both clients is signed off with intact evidence', async () => {
  const fixture = await checkout();
  try {
    const gate = await evaluationGate(fixture);
    assert.deepEqual(gate, { releaseReady: true, behaviorFingerprint: fingerprint, reasons: [] });
    const report = await readReport(fixture.root);
    assert.equal(report.trials[0].signedOffBy, 'octo-reviewer');
    assert.equal(report.trials[0].signedOffAt, now.toISOString());
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('fails while a trial awaits sign-off or carries a hand-written review', async () => {
  const fixture = await checkout({ pending: ['claude/rules'] });
  try {
    let gate = await evaluationGate(fixture);
    assert.equal(gate.releaseReady, false);
    assert.deepEqual(gate.reasons, [
      'claude/rules: semantic review pending; sign off with review:evals',
    ]);
    // Flipping the review by hand, without review:evals, does not count.
    await edit(fixture, (report) => {
      Object.assign(report.trials.at(-1), {
        semanticReview: 'passed',
        signedOffBy: 'octo-reviewer',
        signedOffAt: now.toISOString(),
      });
    });
    gate = await evaluationGate(fixture);
    assert.deepEqual(gate.reasons, [
      'claude/rules: review fields differ from what npm run review:evals recorded',
    ]);
    await edit(fixture, (report) => {
      report.trials[0].signedOffBy = 'Codex assistant in this chat';
    });
    gate = await evaluationGate(fixture);
    assert(gate.reasons.includes('codex/setup: no GitHub handle in signedOffBy'));
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('fails when committed evidence no longer matches its recorded hash', async () => {
  const fixture = await checkout();
  try {
    const path = 'src/phargus/verification/run-1/codex/rules/final.json';
    const original = await readFile(join(fixture.repoRoot, path), 'utf8');
    await writeFile(join(fixture.repoRoot, path), original.replace('final', 'edited'));
    const gate = await evaluationGate(fixture);
    assert.equal(gate.releaseReady, false);
    assert.deepEqual(gate.reasons, ['codex/rules: evidence hash mismatch: ' + path]);
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('fails when an evidence file is missing or unrecorded', async () => {
  const fixture = await checkout();
  try {
    const path = 'src/phargus/verification/run-1/claude/setup/tool-result.json';
    await rm(join(fixture.repoRoot, path));
    let gate = await evaluationGate(fixture);
    assert.deepEqual(gate.reasons, ['claude/setup: evidence file missing: ' + path]);
    // Dropping the entry from the record instead also breaks the runner's digest.
    await edit(fixture, (report) => {
      const trial = report.trials.find(
        (/** @type {any} */ row) => row.client === 'claude' && row.case === 'setup',
      );
      trial.evidence = trial.evidence.filter((/** @type {any} */ item) => item.path !== path);
    });
    gate = await evaluationGate(fixture);
    assert.deepEqual(gate.reasons, [
      'claude/setup: automatic fields differ from what npm run eval recorded',
      'claude/setup: evidence not recorded: ' + path,
    ]);
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('fails for a stale fingerprint with a single clear reason', async () => {
  const fixture = await checkout();
  try {
    const current = 'b'.repeat(64);
    const gate = await evaluationGate({ ...fixture, fingerprint: current });
    assert.deepEqual(gate, {
      releaseReady: false,
      behaviorFingerprint: current,
      reasons: [
        'no reviewed run for fingerprint ' +
          current +
          ': VERIFICATION.json has no trials for the shipped content' +
          ' (its 1 recorded fingerprint(s) are for older content)',
      ],
    });
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('rejects hand-edited automatic results and lets the latest rerun decide', async () => {
  const fixture = await checkout({ failed: ['codex/setup'] });
  try {
    let gate = await evaluationGate(fixture);
    assert.deepEqual(gate.reasons, ['codex/setup: automatic checks failed']);
    await edit(fixture, (report) => {
      report.trials[0].status = 'passed-automatic';
    });
    gate = await evaluationGate(fixture);
    assert(
      gate.reasons.includes('codex/setup: automatic fields differ from what npm run eval recorded'),
    );
    // A later failed rerun supersedes an accepted trial.
    await edit(fixture, (report) => {
      const accepted = report.trials[1];
      const rerun = { ...accepted, run: 'run-2', status: 'failed', reason: 'client exited 1' };
      Object.assign(rerun, { evidence: [], semanticReview: 'pending', signedOffBy: null });
      Object.assign(rerun, { signedOffAt: null, reviewNote: null, reviewDigest: undefined });
      rerun.automaticDigest = automaticDigest(rerun);
      report.trials.splice(0, 1);
      report.trials.push(rerun);
    });
    gate = await evaluationGate(fixture);
    assert.deepEqual(gate.reasons, [
      'codex/setup: no trial for this fingerprint',
      'codex/rules: automatic checks failed: client exited 1',
    ]);
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('signOff accepts only pending, current, automatically passed trials by a GitHub handle', async () => {
  const fixture = await checkout({ pending: ['codex/rules'], failed: ['claude/setup'] });
  try {
    const report = await readReport(fixture.root);
    /** @param {Record<string, unknown>} options */
    const attempt = (options) =>
      signOff(report, {
        run: 'run-1',
        client: 'codex',
        case: 'rules',
        reviewer: 'octo-reviewer',
        decision: 'passed',
        fingerprint,
        root: fixture.root,
        repoRoot: fixture.repoRoot,
        ...options,
      });
    await assert.rejects(attempt({ reviewer: 'Codex assistant' }), /GitHub handle/);
    await assert.rejects(attempt({ fingerprint: 'c'.repeat(64) }), /older behavior fingerprint/);
    await assert.rejects(attempt({ case: 'missing' }), /no trial codex\/missing/);
    await assert.rejects(attempt({ decision: 'rejected' }), /needs a --note/);
    await assert.rejects(attempt({ client: 'claude', case: 'setup' }), /automatic checks/);
    await assert.rejects(attempt({ case: 'setup' }), /already reviewed/);
    const trial = await attempt({ decision: 'rejected', note: 'claimed a proven CPU cause' });
    assert.equal(trial.semanticReview, 'rejected');
    assert.equal(trial.reviewNote, 'claimed a proven CPU cause');
    await assert.rejects(attempt({}), /already reviewed \(rejected\)/);
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});
