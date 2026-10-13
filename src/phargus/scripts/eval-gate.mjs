import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root, repoRoot, pluginDir } from './generate.mjs';
import { clients, readReport, schemaVersion, trialProblems } from './verification.mjs';

/** Plain UTF-16 code-unit order, independent of the machine's locale. @param {string} a @param {string} b */
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * List the files under directory (relative to base) as POSIX paths relative to base. Inside a
 * git work tree only tracked (or staged) files count, so untracked machine litter such as
 * .DS_Store cannot change the fingerprint; outside one (a source tarball) dotfiles are skipped.
 * @param {string} base @param {string} directory @returns {Promise<string[]>}
 */
async function shippedFiles(base, directory) {
  let listing;
  try {
    listing = execFileSync('git', ['ls-files', '-z', '--cached', '--', directory], {
      cwd: base,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    listing = undefined;
  }
  if (listing !== undefined) {
    const files = [];
    for (const path of listing.split('\0').filter(Boolean)) {
      // A tracked file deleted from the work tree is not shipped.
      try {
        await access(join(base, path));
        files.push(path);
      } catch {
        // not present in the work tree
      }
    }
    return files.sort(byCodeUnit);
  }
  /** @param {string} relative @returns {Promise<string[]>} */
  async function walk(relative) {
    const files = [];
    for (const entry of await readdir(join(base, relative), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const path = relative + '/' + entry.name;
      if (entry.isDirectory()) files.push(...(await walk(path)));
      else files.push(path);
    }
    return files;
  }
  return (await walk(directory)).sort(byCodeUnit);
}

/**
 * Fingerprint the shipped instructions and helper behavior. VERIFICATION.json and the evidence
 * under verification/ are deliberately outside it: committing a reviewed run must not change the
 * fingerprint that run was reviewed against.
 */
export async function behaviorFingerprint() {
  const hash = createHash('sha256');
  /** Labels are POSIX paths relative to base, so they do not depend on the checkout or OS.
   * @param {string} base @param {string} path */
  async function add(base, path) {
    hash
      .update(path)
      .update('\0')
      .update(await readFile(join(base, path)))
      .update('\0');
  }
  for (const directory of ['runtime', 'knowledge'])
    for (const path of await shippedFiles(root, directory)) await add(root, path);
  for (const path of await shippedFiles(repoRoot, pluginDir + '/skills')) await add(repoRoot, path);
  for (const file of ['compatibility.json', 'catalog.json']) await add(root, file);
  return hash.digest('hex');
}

/**
 * Release gate. For the current fingerprint, the latest trial of every case in each client must
 * have been written by npm run eval with status passed-automatic, accepted with
 * npm run review:evals under a GitHub handle, and backed by committed evidence whose SHA-256
 * still matches. The options let tests point the gate at a fixture checkout.
 * @param {{root?: string, repoRoot?: string, fingerprint?: string}} [options]
 */
export async function evaluationGate(options = {}) {
  const bases = { root: options.root ?? root, repoRoot: options.repoRoot ?? repoRoot };
  const fingerprint = options.fingerprint ?? (await behaviorFingerprint());
  /** @param {string[]} reasons */
  const result = (reasons) => ({
    releaseReady: reasons.length === 0,
    behaviorFingerprint: fingerprint,
    reasons,
  });
  let report;
  try {
    report = await readReport(bases.root);
  } catch {
    return result(['no verification report: VERIFICATION.json is missing or not JSON']);
  }
  if (report.schemaVersion !== schemaVersion || !Array.isArray(report.trials))
    return result([
      'VERIFICATION.json is not a schema ' + schemaVersion + ' report from npm run eval',
    ]);
  /** @type {{id: string}[]} */
  const cases = JSON.parse(await readFile(join(bases.root, 'evals/cases.json'), 'utf8'));
  const current = report.trials.filter((trial) => trial.behaviorFingerprint === fingerprint);
  if (!current.length) {
    const older = new Set(report.trials.map((trial) => trial.behaviorFingerprint)).size;
    return result([
      'no reviewed run for fingerprint ' +
        fingerprint +
        ': VERIFICATION.json has no trials for the shipped content' +
        (older ? ' (its ' + older + ' recorded fingerprint(s) are for older content)' : ''),
    ]);
  }
  const reasons = current.some((trial) => trial.semanticReview === 'passed')
    ? []
    : ['no reviewed run for fingerprint ' + fingerprint];
  for (const client of clients) {
    for (const scenario of cases) {
      // A rerun supersedes earlier attempts; earlier rows stay as history.
      const trial = current.findLast(
        (candidate) => candidate.client === client && candidate.case === scenario.id,
      );
      const problems = trial
        ? await trialProblems(trial, bases)
        : ['no trial for this fingerprint'];
      for (const problem of problems) reasons.push(client + '/' + scenario.id + ': ' + problem);
    }
  }
  return result(reasons);
}
