import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root, repoRoot, pluginDir } from './generate.mjs';

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

/** Fingerprint the shipped instructions and helper behavior, not ignored trial artifacts. */
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

export async function evaluationGate() {
  const fingerprint = await behaviorFingerprint();
  let report;
  try {
    report = JSON.parse(await readFile(join(root, 'VERIFICATION.json'), 'utf8'));
  } catch {
    return { releaseReady: false, reasons: ['no reviewed model verification report'] };
  }
  /** @type {{client: string, case: string, status: string, semanticReview: string, reason?: string}[]} */ const results =
    report.results ?? [];
  const cases = JSON.parse(await readFile(join(root, 'evals/cases.json'), 'utf8'));
  const reasons = [];
  if (report.behaviorFingerprint !== fingerprint)
    reasons.push('shipped instructions/helpers changed since behavioral review');
  for (const client of ['codex', 'claude']) {
    for (const scenario of cases) {
      const rows = results.filter(
        (result) => result.client === client && result.case === scenario.id,
      );
      if (rows.length !== 1 || rows[0].status !== 'passed' || rows[0].semanticReview !== 'passed')
        reasons.push(
          client + '/' + scenario.id + ': ' + (rows[0]?.reason ?? 'not behaviorally verified'),
        );
    }
  }
  return { releaseReady: reasons.length === 0, reasons };
}
