import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root, repoRoot, pluginDir } from './generate.mjs';

/** Fingerprint the shipped instructions and helper behavior, not ignored trial artifacts. */
export async function behaviorFingerprint() {
  const hash = createHash('sha256');
  /** Hash labels stay relative to base, so they do not depend on where the checkout lives.
   * @param {string} base @param {string} relative */
  async function visit(base, relative) {
    const entries = await readdir(join(base, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(relative, entry.name);
      if (entry.isDirectory()) await visit(base, path);
      else
        hash
          .update(path)
          .update('\0')
          .update(await readFile(join(base, path)))
          .update('\0');
    }
  }
  for (const directory of ['runtime', 'knowledge']) await visit(root, directory);
  await visit(repoRoot, pluginDir + '/skills');
  for (const file of ['compatibility.json', 'catalog.json'])
    hash.update(file).update(await readFile(join(root, file)));
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
