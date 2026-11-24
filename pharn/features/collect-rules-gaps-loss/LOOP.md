---
decision: STOP_CAP
iterations: 1
cap: 1
commit: 248c0f6cf7571b91993fd98f8ab76eb0dc7ff503
date: 2026-11-24
isolation: {"outcome":"HOST","evidence":["cred:ssh-dir","cred:ssh-agent","cred:gh-hosts","cred:credential-helper","cred:aws-credentials","cred:npmrc-home"],"accepted_host_execution":true}
---

# LOOP — collect-rules-gaps-loss

- Stages: spec (full, model-approved), plan, grill (full: chain GREEN, lessons GREEN, 4 findings), triage (proceed 4,
  replan 0, spec 0), entry gates green, test (READY test-first, red run recorded for AC-1..AC-8), then build →
  regress → verify for iteration 1 (cap 1).
- Iteration 1: build `done gate:pass`; regress `no-regressions`; verify FAIL; freshness FRESH; check-loop exit 1
  STOP_CAP.
- Standing red: verify gate `ac-delivery`, with AC-1..AC-8 each reported as not run by the root `test` gate.
  No gate was unmeasured; no regression.
- Pointers: GRILL.md, grill-findings.json, grill-triage.json, REGRESSION.md, VERIFY.md, BUILD.md, verify-report.json.

## Outcome

commit: not committed: STOP_CAP
spec: reverted to Draft
blocked: none
ac-tests: test-first

## Handoff

### investigated

The root `package.json` `test` script does not load `src/phargus/test/`. The test stage's red run and the build's
targeted gate passed the pinned test files to that command directly, so both saw the AC tests; `/pharn-verify` runs
the bare gate, which never loads `src/phargus/test/collect-rules-quality.test.mjs` or
`src/phargus/test/integration/collect-rules-quality.test.mjs`. A rebuild cannot change this, so the cap was set to 1.

### learned

As with the CORE-236 loop, a PHARN loop over `src/phargus` cannot reach a green verify while the root `test` gate
does not run the phargus suites. The build agent reported (DATA) that `npm test`, `npm run test:integration`,
`typecheck`, `lint`, `format:check`, `check:generated`, `check:skills` and `check:package` passed from `src/phargus`.

### next_steps

Finish the change outside the loop: run the `src/phargus` gates directly, fold the AC tests into behaviour-named
permanent tests in the files the issue names, and commit the change with these feature artifacts.
