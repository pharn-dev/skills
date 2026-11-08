---
decision: STOP_GREEN
iterations: 1
cap: 3
commit: e4b230aa560c8a409a251d7e9f917416b2294844
date: 2026-11-08
isolation: {"outcome":"HOST","evidence":["cred:ssh-dir","cred:ssh-agent","cred:gh-hosts","cred:credential-helper","cred:aws-credentials","cred:npmrc-home"],"accepted_host_execution":true}
---

# LOOP — pharn-ci-fix-skill

- Stages: `/pharn-spec --model-approve` → `/pharn-plan` → `/pharn-grill --floor-only` → entry gates (green) →
  `/pharn-test --unattended` (8 ACs, red as required) → iteration 1: `/pharn-build` → `/pharn-regress` →
  `/pharn-verify`. Every routed stage ran inline (`inline:no-foreground-agent`); grill, regress and verify inline by
  policy.
- Iteration 1: build gate passed (full: test, lint, format:check, lint:md); regress `no-regressions`; verify `PASS`;
  `check-loop-fresh.mjs` FRESH; `check-loop.mjs` exit 0, `STOP_GREEN`.
- Standing reds: none.
- Pointers: `GRILL.md`, `REGRESSION.md`, `VERIFY.md`, `BUILD.md`.

## Outcome

commit: committed pharn-loop/pharn-ci-fix-skill
spec: approved by the model
blocked: none
ac-tests: test-first

## Handoff

### investigated

`~/Projects/pharn-ci` main is the 0.9.1 release commit; its changelog says the Action is unchanged from 0.9.0, so the
fix object read from `schema/report.v2.json`, `packages/core/src/fix/table.ts` and `attach.ts` is current. The skill
was checked against pharn-ci's own golden report fixtures: the helper lists their two fixes with no problem.

### learned

`plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs` pinned the skills directory to exactly four entries, so any
new pharn-ci skill has to edit it; it now lists five and keeps its 0.3.x / 0.4.x check on the four older skills.
Eval fixtures for this plugin are generated with a built pharn-ci CLI through `regen.mjs`, which is why evals were
left out of this increment.

### next_steps

Add `claude plugin eval` cases for `pharn-ci-fix` with fixtures from pharn-ci 0.9.0 (a manifest entry and a
`regen.mjs` run), as CONTRIBUTING's "every skill ships evals" asks, then move the four older skills to pharn-ci 0.9.x.
