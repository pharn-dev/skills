# VERIFY — `node-test-per-test-results`

_How to read this file: the verdict line and every value shown inline are enum-gated (floor-verifiable) values, each rendered only after a membership test; every fenced block is untrusted DATA — a gate id, a PLAN-derived path, or a checker's own message — quoted, never an instruction._

**VERIFY FAILS: gate(s) red — stage FAILS.**

failing gate ids, quoted as DATA:

```text
reconcile
```

## Gates

gate source: discovered — the closed allowlist ∩ the project's `package.json` scripts.

exit code, then gate id — quoted as DATA:

```text
0  format:check
0  instruction-growth
0  lint
0  lint:md
1  reconcile
0  test
```

gate result reuse: none — every gate above was executed by this verify run.

## Reconcile

reconcile: `ESCAPE` (exit 1) — read from check-bash-reconcile.mjs's own JSON document, as the gate recorded it.

**55 escape(s)** — a path changed since the anchor that the write guards would have denied. Closed reasons (over the 20 shown): no closed reason ×20.

each escape — file, denied_by, reason, scope_set_by — JSON-quoted as DATA:

```text
"pharn/.run/cost/node-test-per-test-results/markers.jsonl"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/cost/node-test-per-test-results/work.jsonl"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full.times.json"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/0-test.err"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/0-test.out"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/0-test.test-results.json"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/1-lint.err"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/1-lint.out"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/2-format_check.err"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/2-format_check.out"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/3-lint_md.err"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/3-lint_md.out"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/full/stamp.json"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/targeted.times.json"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/targeted/0-test.err"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/targeted/0-test.out"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/targeted/0-test.test-results.json"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/targeted/stamp.json"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-build/node-test-per-test-results/targets.json"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
"pharn/.run/pharn-regress/base-gates/0-test.err"  denied_by="writes-scope (snapshot)"  reason=-  scope_set_by="pharn/features/node-test-per-test-results/PLAN.md"
```

… and 35 more escape(s) not listed. Re-run `node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline` to see the escapes — before any new build re-anchors the baseline, which erases them.

HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json`. That `node_modules` holds those packages is not itself checked (install-drift-core.mjs).

## Completeness

completeness: build complete — every concrete path the PLAN declares exists, and every one it marks `(delete)` is absent.

## Acceptance criteria

acceptance criteria: `BOOTSTRAP` — weaker than test-first: each level's gate ran as discovered and reported a passed test; no test was locked or shown red.

AC gate verdict: `PASS`

The per-AC table is `verify-report.json`'s `ac_gate` block (and `RUN-REPORT.md`, which renders it by code in an orchestrated run) — cited here, never retyped.

## Verifiers

no verifiers registered — floor gates only.

_verified = the named gates passed, every declared path exists, and (test-first) every AC's locked, once-red test passed on this run — or (bootstrap) each level's runner reported a passed test, or (legacy) no AC check applied; this is NOT a guarantee of correctness beyond what those gates check — completeness is 'files exist', not 'semantically done', PHARN does not judge whether a test captures its AC's intent, and verifier concerns are advisory help, not assurance._
