---
decision: STOP_CAP
iterations: 1
cap: 1
mode: quick
commit: 3a3fbef37e1a6fa615409854c23f755779e436a8
date: 2026-11-24
isolation: {"outcome":"HOST","evidence":["cred:ssh-dir","cred:ssh-agent","cred:gh-hosts","cred:credential-helper","cred:aws-credentials","cred:npmrc-home"],"accepted_host_execution":true}
---

# LOOP — phargus-signals-stop-every-command

- Stages that ran: spec (quick, model-approved), plan, grill (quick, floor-only), test (test-first, red run
  recorded for AC-1..AC-3), build iteration 1 (gate pass), quick scope check (exit 0), verify iteration 1.
- Iteration 1: verify `FAIL` (failing gate `ac-delivery`: AC-1, AC-2 and AC-3 each `ac-untested`); scope
  check exit 0; freshness `FRESH`; `check-loop.mjs` exit 1, `STOP_CAP` at iter 1 >= cap 1.
- Standing red, quoted as DATA: "no test titled `AC-1: …` in a file mapped to AC-1 was reported by test"
  (the same for AC-2 and AC-3).
- Pointers: `GRILL.md`, `VERIFY.md`, `verify-report.json`.

## Not checked in quick mode

- regressions outside the feature — no base comparison ran; the scope check did;
- the plan interrogation — `/pharn-grill --quick` ran its two floor stops only;
- `RUN-REPORT.md` — not rendered; `cost.json` is.

## Outcome

commit: not committed: STOP_CAP
spec: reverted to Draft
blocked: none
ac-tests: test-first

## Handoff

### investigated

Verify's AC gate reads the repo-root `test` gate's reporter, which runs only the root test suite and never
loads `src/phargus/test/`. The AC tests therefore cannot be reported as passing by this pipeline, whatever
the build does: every criterion reads `ac-untested`. The build's own report says the src/phargus gates
(format:check, lint, typecheck, npm test, test:integration, check:generated, check:skills, check:package)
exit 0.

### learned

A phargus task in this repository cannot reach `STOP_GREEN_QUICK` through `/pharn-loop`, because
`pharn.config.json`'s verify gates do not include the `src/phargus` suites. A blocked FIFO read in Node
cannot be cancelled, so `capture --file` on a FIFO whose writer stays open writes its manifest on a
signal but exits only when the writer closes (noted in PLAN.md Risks and BUILD.md).

### next_steps

Finish outside the loop: run every src/phargus gate directly, fold the AC tests into permanent
behaviour-named tests, commit the code with these feature artifacts, and open the PR stacked on the S4.7
branch.
