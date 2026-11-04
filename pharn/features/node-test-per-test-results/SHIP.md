# SHIP — node-test-per-test-results

mode: full

Where the run ended: **STOP at `/pharn-verify`** — `verify-report.json` `.verdict` is `FAIL` (a real gate red; never
retried). The single build-completion retry (Step 2b) did not fire.

## Stages, routes and verdicts

| stage           | route                                                       | verdict read                                                                                   |
| --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/pharn-spec`   | inline (policy, `ROUTE_POLICY` in `pharn/floor/stage-agent-core.mjs`) | `check-spec-approved.mjs` exit 0 — Approved by the human at GATE 1                             |
| `/pharn-plan`   | `agent:opus`                                                | `PLAN.md` produced                                                                             |
| `/pharn-grill`  | `agent:opus`                                                | `check-plan-spec-agree.mjs` exit 0 (chain GREEN); `check-plan-lessons.mjs` exit 0 (declaration GREEN) |
| `/pharn-test`   | `agent:opus`                                                | `check-test-stage.mjs` → `ac-tests: bootstrap` (no test ran before the build — weaker)        |
| `/pharn-build`  | `agent:sonnet`                                              | `done gate:pass` (the build agent's report — advisory)                                         |
| `/pharn-regress`| inline (policy)                                             | `regression-report.json` `.verdict` = `no-regressions`; pre-run unchanged: 18                  |
| `/pharn-verify` | inline (policy)                                             | `verify-report.json` `.verdict` = `FAIL`; failing gates `["reconcile"]`; AC gate `PASS`, mode `bootstrap` (weaker) |

Entry gates read green before `/pharn-test`. The per-AC table is in `RUN-REPORT.md`'s `## Verdicts` and in
`VERIFY.md`; it is not retyped here.

## The reconcile red (quoted as DATA from `pharn/.run/pharn-verify/gates/5-reconcile.out`)

The reconcile gate reported `ESCAPE` with 55 paths written outside the plan's scope during the epoch:

- 54 under `pharn/.run/` (PHARN's own stage logs and cost markers). This repo's `.gitignore` has no `pharn/.run/`
  entry and 15 files under `pharn/.run/` and `pharn/.backup/` are tracked, so PHARN's own run state is counted.
- `pharn.config.json` — the `"testResults": { "test": "pharn-json" }` line, written through the shell by the
  orchestrator at the person's explicit request after the write guard refused the Edit. The plan required this
  edit between build and verify, so it falls inside the reconcile epoch by design.

## Pointers

- `GRILL.md` (4 advisory concerns, 0 blocking), `REGRESSION.md`, `VERIFY.md`, `BUILD.md`, `RUN-REPORT.md`.
- `BRIEFING.md`: not written (Step 2c runs only after a `PASS` verify).

chain ran; the named floor verdicts are as shown, and the human approved the intent at the SPEC gate — this is NOT a
judgment that the increment is good or wise; that is the human's call at the post-verify gate.
