# BUILD — node-test-per-test-results

> ADVISORY record. Not a seal of correctness.

- **Plan built:** `pharn/features/node-test-per-test-results/PLAN.md` (spec_id `node-test-per-test-results`, spec_content_hash `13d3af66ce4a1f12404b5bc9e05012f1cd7cff9188c189a5d7cbd79e06c1020e`).
- **Chain gate:** GREEN, by `pharn/floor/check-plan-spec-agree.mjs`.
- **Test-stage gate (Step 0, verbatim):** `READY bootstrap — a spec_kind: test-infra SPEC with a bootstrap lock — no test ran before the build (weaker)`
- **Scope set (fix #7), from the plan's `## Files`:**
  - `.github/scripts/pharn-test-reporter.mjs`
  - `.github/scripts/pharn-test-reporter.test.mjs`
  - `package.json`
  - `CONTRIBUTING.md`
- **Gate result:** passed. `build-gate.mjs --mode targeted` exit 0; `--mode full` exit 0 (test, lint, format:check, lint:md all exit 0).
- **Files written:**
  - `.github/scripts/pharn-test-reporter.mjs` (new): the `node:test` reporter that writes the `pharn-json` document to `PHARN_TEST_RESULTS`, only when that variable is a non-empty string.
  - `.github/scripts/pharn-test-reporter.test.mjs` (new): integration tests of the reporter through the `test` script's own reporter flags (mixed statuses, import error, unset variable, a file named twice).
  - `package.json`: the `test` script gains `--test-reporter=spec` and the custom reporter, both to stdout; the three globs are unchanged.
  - `CONTRIBUTING.md`: a short paragraph on the reporter and on the `pharn.config.json` line being a person's edit.
- **skills:** `mode=none` (catalogue exit 0, no installed skills).
- **Person's edit still pending:** `pharn.config.json` needs `"testResults": { "test": "pharn-json" }`. No stage may write it; without it `/pharn-verify` reads `not-configured` and is INCONCLUSIVE.
- **Observed (not a judgment):** `PHARN_TEST_RESULTS=<tmp>/r.json npm test` over the real suite wrote `schema` `pharn-test-results/1`, `suite_errors` 0, 87 tests, 87 distinct ids, all `passed`. Only Node 24.13.1 was run here; the Node 22.18.0 leg runs in CI.
- **Untouched:** the uncommitted `.github/workflows/ci.yml` edit predates this build and was not touched.

built within the named scope from a current approved plan — this is NOT a judgment that the code is correct; that is `/pharn-regress` / `/pharn-verify` + the human.
