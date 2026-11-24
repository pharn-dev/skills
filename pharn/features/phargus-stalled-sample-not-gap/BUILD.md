# BUILD — phargus-stalled-sample-not-gap

Advisory record (P0). Not a judgment that the code is correct.

- Plan built: `pharn/features/phargus-stalled-sample-not-gap/PLAN.md`.
- Chain gate: GREEN, by `check-plan-spec-agree.mjs`.
- Test-stage gate (Step 0, verbatim): `READY test-first`.
- Writes-scope set (fix #7): the 27 paths of the plan's `## Files`.
- skills: mode=none (catalogue `installed-skills/1`, no skills installed).
- Seam config: GREEN (`check-seam-config.mjs`); no seam was touched.

## Gate result

- `build-gate.mjs --mode targeted`: exit 0.
- `build-gate.mjs --mode full`: exit 0 (the gate passed). It ran `test`, `lint`, `format:check`, `lint:md`.
- From `src/phargus`, the plan's own list: `format:check`, `lint`, `typecheck`, `test` (74 pass),
  `check:generated`, `check:skills` and `check:package` all passed.
- `npm run test:integration`: NOT run to a result. It needs `.cache/integration.json`, which
  `npm run prepare:integration` writes; that script failed here with `spawnSync git ENOENT`
  (no `git` on the sandbox PATH, and it needs the network). Left for `/pharn-verify` or the human.

## Iteration 2

- Read `verify-report.json`: the only failing gate is `ac-delivery` (AC-1, AC-2, AC-3 all `ac-untested`: no
  test titled `AC-<n>:` was reported by `test`). No completeness gap, no other red gate.
- Cause, not an implementation defect: the repo root `test` script globs only `.github/scripts`,
  `plugins/pharn-ci/tests` and `plugins/pharn-ci/evals/fixtures`, so a bare `npm test` (what `/pharn-verify` runs)
  never loads `src/phargus/test/stalled-samples.test.mjs`. `build-gate.mjs --mode targeted` appends the declared
  test file, which is why it reports green. This is the test-infrastructure risk the PLAN flagged for the test stage.
  The script is pinned by the AC lock (`pharn/pharn-contracts/ac-tests.md`), so a rebuild must not change it, and the
  AC test file is outside this build's scope. Nothing in `## Files` can clear it.
- Re-ran this iteration: `build-gate.mjs --mode targeted` exit 0, `--mode full` exit 0; from `src/phargus`,
  `npm test` 74 pass and `npm run check:generated` verified. No implementation file changed in this iteration.

## Iteration 3

- Step 0 test-stage gate: `READY test-first`. Chain gate: GREEN. Scope set from the plan's 27 paths.
- Read `verify-report.json`: unchanged from iteration 2. `failing_gates` is `ac-delivery` only; AC-1, AC-2, AC-3
  are `ac-untested`; `completeness` is complete, no other gate is red.
- No implementation file changed. The implementation matches the plan, and the cause is still the pinned root `test`
  script not loading `src/phargus/test/stalled-samples.test.mjs`. Fixing it means editing a test-infrastructure
  script or the AC test, both outside `## Files` and pinned by the lock. This needs the human.
- Re-ran: `build-gate.mjs --mode targeted` exit 0, `--mode full` exit 0 (`test`, `lint`, `format:check`, `lint:md`).

## Files written

- `src/phargus/runtime/records.mjs`: `quality()` gains `stalledSamples`/`stalledMs`; `qualityTracker` applies the stalled-sample rule.
- `src/phargus/runtime/summary.mjs`: `sampleCoverageMs` helper used by both sample-coverage checks.
- `src/phargus/runtime/types.d.ts`: `Quality` declares both fields.
- `src/phargus/knowledge/data.md`, `src/phargus/knowledge/verification.md`: the rule and the coverage wording.
- The 21 generated plugin copies under `plugins/phargus/skills/*` (records, summary, types, data.md, and
  phargus-verify's verification.md), edited to match the source; `check:generated` passes. `npm run build` was not run.
- `CHANGELOG.md`: one `### Fixed` bullet under `[Unreleased]`.

Built within the named scope from a current approved plan — this is NOT a judgment that the code is correct; that is `/pharn-regress` / `/pharn-verify` + the human.
