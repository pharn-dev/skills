# REGRESSION — node-test-per-test-results

base: `c99fa521b97925c944588c2301cc5f0820794614` — chosen by: named with --base

**verdict: NO REGRESSIONS** — no deterministically-detectable breakage outside the feature.

BASE evidence: produced by this invocation (not reused: `no-record`; entry evidence not used: `start-dirty`); recorded for reuse by a later /pharn-regress of this run.

install:

```text
npm ci
```

HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json`. That `node_modules` holds those packages is not itself checked (install-drift-core.mjs).

## Scope

inside (27):

```text
.github/workflows/ci.yml
CONTRIBUTING.md
package.json
.github/scripts/pharn-test-reporter.mjs
.github/scripts/pharn-test-reporter.test.mjs
pharn/features/node-test-per-test-results/AC-TESTS.lock.json
pharn/features/node-test-per-test-results/BUILD.md
pharn/features/node-test-per-test-results/GRILL.md
pharn/features/node-test-per-test-results/PLAN.md
pharn/features/node-test-per-test-results/SPEC.md
pharn/features/pharn-ci-plugin-0-4-2/AC-TESTS.md
pharn/features/pharn-ci-plugin-0-4-2/LOOP.md
pharn/features/pharn-ci-plugin-0-4-2/PLAN.md
pharn/features/pharn-ci-plugin-0-4-2/RUN-REPORT.md
pharn/features/pharn-ci-plugin-0-4-2/SPEC.md
pharn/features/pharn-ci-plugin-0-4-2/cost.json
pharn/features/pharn-ci-plugin-0-4-3/AC-TESTS.md
pharn/features/pharn-ci-plugin-0-4-3/GRILL.md
pharn/features/pharn-ci-plugin-0-4-3/LOOP.md
pharn/features/pharn-ci-plugin-0-4-3/PLAN.md
pharn/features/pharn-ci-plugin-0-4-3/RUN-REPORT.md
pharn/features/pharn-ci-plugin-0-4-3/SPEC.md
pharn/features/pharn-ci-plugin-0-4-3/cost.json
pharn/features/pharn-ci-plugin-0-4/LOOP.md
pharn/features/pharn-ci-plugin-0-4/RUN-REPORT.md
pharn/features/pharn-ci-plugin-0-4/SPEC.md
pharn/features/pharn-ci-plugin-0-4/cost.json
```

declared (4):

```text
.github/scripts/pharn-test-reporter.mjs
.github/scripts/pharn-test-reporter.test.mjs
package.json
CONTRIBUTING.md
```

escape-exempt (5) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:

```text
pharn/features/node-test-per-test-results/AC-TESTS.lock.json
pharn/features/node-test-per-test-results/BUILD.md
pharn/features/node-test-per-test-results/GRILL.md
pharn/features/node-test-per-test-results/PLAN.md
pharn/features/node-test-per-test-results/SPEC.md
```

already changed when this run began (18) — the run's pre-run snapshot recorded these with exactly the bytes they hold now, so they are reported, NOT counted as this build's escape (a re-run records an earlier run's escape the same way; pre-run-snapshot-core.mjs states the bounds):

```text
.github/workflows/ci.yml
pharn/features/pharn-ci-plugin-0-4-2/AC-TESTS.md
pharn/features/pharn-ci-plugin-0-4-2/LOOP.md
pharn/features/pharn-ci-plugin-0-4-2/PLAN.md
pharn/features/pharn-ci-plugin-0-4-2/RUN-REPORT.md
pharn/features/pharn-ci-plugin-0-4-2/SPEC.md
pharn/features/pharn-ci-plugin-0-4-2/cost.json
pharn/features/pharn-ci-plugin-0-4-3/AC-TESTS.md
pharn/features/pharn-ci-plugin-0-4-3/GRILL.md
pharn/features/pharn-ci-plugin-0-4-3/LOOP.md
pharn/features/pharn-ci-plugin-0-4-3/PLAN.md
pharn/features/pharn-ci-plugin-0-4-3/RUN-REPORT.md
pharn/features/pharn-ci-plugin-0-4-3/SPEC.md
pharn/features/pharn-ci-plugin-0-4-3/cost.json
pharn/features/pharn-ci-plugin-0-4/LOOP.md
pharn/features/pharn-ci-plugin-0-4/RUN-REPORT.md
pharn/features/pharn-ci-plugin-0-4/SPEC.md
pharn/features/pharn-ci-plugin-0-4/cost.json
```

## Gates

gate: base exit 1 -> head exit 0 — pre-existing (already red at base) — id (quoted, untrusted): test

style gates were SKIPPED (config-touch rule: no shared style config changed in scope).

## Pre-existing and regressions

pre_existing (1): test
regressions (0): (none)

_/pharn-regress catches exactly what the project's own deterministic suite catches, nothing more — but deterministically. This is not a claim that nothing broke._
