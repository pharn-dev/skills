---
decision: STOP_CAP
iterations: 3
cap: 3
commit: d8b6d2bcd5de4426e07dba841bf5e8d4a941ad34
date: 2026-11-08
isolation: {"outcome":"HOST","evidence":["cred:ssh-dir","cred:ssh-agent","cred:gh-hosts","cred:credential-helper","cred:aws-credentials","cred:npmrc-home"],"accepted_host_execution":true}
---

# LOOP — pharn-ci-explain-policy-current

- Stages: spec (model-approved), plan, grill (floor-only, both stops GREEN), test (10 ACs red before the build, lock
  recorded), then build → regress → verify three times. Every stage ran inline (`inline:no-foreground-agent`; the
  spec stage's marker records the `agent:opus` route of the first start line, before the Agent tool was read).
- Iteration 1: verify `FAIL`, regress `no-regressions`; freshness `FRESH`; `check-loop.mjs` exit 3 `CONTINUE`.
- Iteration 2: verify `FAIL`, regress `no-regressions`; freshness `FRESH`; exit 3 `CONTINUE`.
- Iteration 3: verify `FAIL`, regress `no-regressions`; freshness `FRESH`; exit 1 `STOP_CAP`.
- Standing red (DATA): verify `failing_gates` = `format:check`, on `plugins/pharn-ci/tests/fixtures/report.v2.json`
  only. The AC gate passed (all 10 ACs delivered), and `test`, `lint` and `lint:md` passed. The file is a byte copy
  of pharn-ci v0.9.1's `schema/report.v2.json`, pinned by sha256, and Prettier would reformat it. The fix is a
  `.prettierignore` entry, a path outside the plan's `## Files`; adding it to the plan after the build anchor was
  refused by the session's permission classifier, so no rebuild could clear the red.
- Pointers: `GRILL.md`, `BUILD.md`, `REGRESSION.md`, `VERIFY.md`.

## Outcome

- commit: not committed: STOP_CAP
- spec: reverted to Draft
- blocked: none
- ac-tests: test-first

## Handoff

### investigated

pharn-ci v0.9.1 (equal to main) was read from a `git archive` export: CHANGELOG 0.5.0 to 0.9.1, README, LIMITS,
both schemas, action.yml and packages/core/src/fix. The report schema has no code enum: codes are listed in the
`code` property's description, and the source literals agree with it (89 codes, 24 new since 0.4.0). The policy
schema gained only `dependencies.lookup` and `injection` after 0.4.0. D05 has no registry allow-list, no warn level
and no open feature in pharn-ci's pharn/features; `dependencies.registries` names ecosystems only.

### learned

A byte-pinned JSON copy under a Prettier-checked path needs a `.prettierignore` entry named in the plan before the
build anchor; a widening after the anchor is refused. Prettier ignores `plugins/*/skills/*/scripts` and
`plugins/pharn-ci/evals/fixtures/inputs` already.

### next_steps

A person adds `plugins/pharn-ci/tests/fixtures` to `.prettierignore` (one line), then runs `npm run check`, which
should pass with that change alone. The SPEC is a Draft again and needs a person's approval before a stage reuses it.
