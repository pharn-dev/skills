import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { root, repoRoot } from './generate.mjs';

/**
 * VERIFICATION.json, schema 2. npm run eval appends one run per invocation and one trial per
 * client and case, with redacted evidence committed under verification/<run>/<client>/<case>/.
 * npm run review:evals is the only writer of the review fields. Neither file nor evidence is part
 * of the behavior fingerprint, so committing them does not invalidate the review they record.
 *
 * The digests make hand edits of runner- or reviewer-written fields detectable; they are
 * consistency checks, not signatures. Accountability comes from the committed evidence and from
 * the sign-off landing in a reviewed pull request.
 *
 * @typedef {{path: string, sha256: string}} Evidence
 * @typedef {{
 *   run: string, client: string, case: string, behaviorFingerprint: string, status: string,
 *   reason?: string, evidence: Evidence[], automaticDigest: string, semanticReview: string,
 *   signedOffBy: string | null, signedOffAt: string | null, reviewNote: string | null,
 *   reviewDigest?: string
 * }} Trial
 * @typedef {{schemaVersion: number, runs: Record<string, unknown>[], trials: Trial[]} & Record<string, unknown>} Report
 */

export const schemaVersion = 2;
export const clients = ['codex', 'claude'];
/** Redacted files the runner commits for every executed trial. */
export const evidenceFiles = ['final.json', 'tool-result.json', 'commands.json'];
/** GitHub's login rules: alphanumerics and single inner hyphens, at most 39 characters. */
export const githubHandle = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
export const runId = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** @param {string | Uint8Array} data */
export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** Hash of the fields npm run eval writes. Field order is fixed here, not by the JSON file. @param {Trial} trial */
export function automaticDigest(trial) {
  return sha256(
    JSON.stringify([
      trial.run,
      trial.client,
      trial.case,
      trial.behaviorFingerprint,
      trial.status,
      trial.reason ?? null,
      (trial.evidence ?? []).map((item) => [item.path, item.sha256]),
    ]),
  );
}

/** Hash of the review fields, bound to the automatic result they judged. @param {Trial} trial */
export function reviewDigest(trial) {
  return sha256(
    JSON.stringify([
      trial.automaticDigest,
      trial.semanticReview,
      trial.signedOffBy,
      trial.signedOffAt,
      trial.reviewNote ?? null,
    ]),
  );
}

/** @returns {Report} */
export function emptyReport() {
  return { schemaVersion, plugin: 'phargus', runs: [], trials: [] };
}

/** @param {string} [base] @returns {Promise<Report>} */
export async function readReport(base = root) {
  return JSON.parse(await readFile(join(base, 'VERIFICATION.json'), 'utf8'));
}

/** @param {Report} report @param {string} [base] */
export async function writeReport(report, base = root) {
  await writeFile(join(base, 'VERIFICATION.json'), JSON.stringify(report, null, 2) + '\n');
}

/** Repository-relative POSIX directory of a trial's evidence. @param {string} run @param {string} client @param {string} scenario @param {{root?: string, repoRoot?: string}} [bases] */
export function evidenceDirectory(run, client, scenario, bases = {}) {
  return relative(
    bases.repoRoot ?? repoRoot,
    join(bases.root ?? root, 'verification', run, client, scenario),
  )
    .split(sep)
    .join('/');
}

/**
 * Check that a trial lists every evidence file inside its own directory and that each file is
 * committed with the recorded hash.
 * @param {Trial} trial @param {{root?: string, repoRoot?: string}} [bases] @returns {Promise<string[]>}
 */
export async function evidenceProblems(trial, bases = {}) {
  if (typeof trial.run !== 'string' || !runId.test(trial.run)) return ['invalid run id'];
  if (!Array.isArray(trial.evidence)) return ['no evidence list'];
  const directory = evidenceDirectory(trial.run, trial.client, trial.case, bases) + '/';
  /** @type {string[]} */ const problems = [];
  for (const name of evidenceFiles)
    if (!trial.evidence.some((item) => item.path === directory + name))
      problems.push('evidence not recorded: ' + directory + name);
  for (const item of trial.evidence) {
    const path = String(item?.path);
    if (!path.startsWith(directory) || path.split('/').includes('..')) {
      problems.push('evidence outside the trial directory: ' + path);
      continue;
    }
    let data;
    try {
      data = await readFile(join(bases.repoRoot ?? repoRoot, ...path.split('/')));
    } catch {
      problems.push('evidence file missing: ' + path);
      continue;
    }
    if (sha256(data) !== item.sha256) problems.push('evidence hash mismatch: ' + path);
  }
  return problems;
}

/**
 * Everything that keeps one trial from counting toward the release gate.
 * @param {Trial} trial @param {{root?: string, repoRoot?: string}} [bases] @returns {Promise<string[]>}
 */
export async function trialProblems(trial, bases = {}) {
  /** @type {string[]} */ const problems = [];
  if (trial.automaticDigest !== automaticDigest(trial))
    problems.push('automatic fields differ from what npm run eval recorded');
  if (trial.status !== 'passed-automatic')
    return [
      ...problems,
      'automatic checks ' + trial.status + (trial.reason ? ': ' + trial.reason : ''),
    ];
  if (trial.semanticReview !== 'passed')
    problems.push(
      'semantic review ' + (trial.semanticReview ?? 'missing') + '; sign off with review:evals',
    );
  else {
    if (typeof trial.signedOffBy !== 'string' || !githubHandle.test(trial.signedOffBy))
      problems.push('no GitHub handle in signedOffBy');
    if (typeof trial.signedOffAt !== 'string' || Number.isNaN(Date.parse(trial.signedOffAt)))
      problems.push('no valid signedOffAt');
    if (trial.reviewDigest !== reviewDigest(trial))
      problems.push('review fields differ from what npm run review:evals recorded');
  }
  problems.push(...(await evidenceProblems(trial, bases)));
  return problems;
}

/**
 * Record a reviewer's decision on one pending trial. Acceptance requires a trial that passed its
 * automatic checks for the current fingerprint, intact digests and committed evidence. Decisions
 * are final: a rejected or mistaken trial is superseded by rerunning it, not by editing it.
 * @param {Report} report
 * @param {{run: string, client: string, case: string, reviewer: string, decision: 'passed' | 'rejected',
 *   note?: string, fingerprint: string, now?: Date, root?: string, repoRoot?: string}} options
 * @returns {Promise<Trial>}
 */
export async function signOff(report, options) {
  const reviewer = options.reviewer.replace(/^@/, '');
  if (!githubHandle.test(reviewer)) throw new Error('--reviewer must be a GitHub handle');
  if (options.decision === 'rejected' && !options.note?.trim())
    throw new Error('--reject needs a --note explaining the failed rubric item');
  const matches = (report.trials ?? []).filter(
    (trial) =>
      trial.run === options.run && trial.client === options.client && trial.case === options.case,
  );
  if (matches.length !== 1)
    throw new Error(
      'no trial ' + options.client + '/' + options.case + ' in run ' + options.run + ' to review',
    );
  const trial = matches[0];
  if (trial.semanticReview !== 'pending')
    throw new Error('trial already reviewed (' + trial.semanticReview + '); rerun it instead');
  if (trial.automaticDigest !== automaticDigest(trial))
    throw new Error('automatic fields differ from what npm run eval recorded');
  if (options.decision === 'passed') {
    if (trial.status !== 'passed-automatic')
      throw new Error('only a trial that passed its automatic checks can be accepted');
    if (trial.behaviorFingerprint !== options.fingerprint)
      throw new Error('trial is for an older behavior fingerprint; rerun it');
    const problems = await evidenceProblems(trial, options);
    if (problems.length) throw new Error(problems.join('; '));
  }
  trial.semanticReview = options.decision;
  trial.signedOffBy = reviewer;
  trial.signedOffAt = (options.now ?? new Date()).toISOString();
  trial.reviewNote = options.note?.trim() || null;
  trial.reviewDigest = reviewDigest(trial);
  return trial;
}
