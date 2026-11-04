---
decision: INCONCLUSIVE
blocked: unlisted-ask
iterations: 1
cap: 3
commit: c99fa521b97925c944588c2301cc5f0820794614
date: 2026-10-27
isolation: {"outcome":"HOST","evidence":["cred:ssh-dir","cred:ssh-agent","cred:gh-hosts","cred:credential-helper","cred:aws-credentials","cred:npmrc-home"],"accepted_host_execution":true}
---

# LOOP — pharn-ci-plugin-0-4-2

- Re-run of `pharn/features/pharn-ci-plugin-0-4/` (stopped at S6b) with the person's answer, option (a), written
  into the request: allow one edit to `.github/workflows/ci.yml`'s pharn-ci-fixtures job.
- Stages that ran: `/pharn-spec --model-approve` (route `agent:opus`; `finish` printed `done`;
  `check-spec-approved.mjs` GREEN), then `/pharn-plan` (route `agent:opus`; `finish` printed `refused S10`).
- The loop stopped at stuck point **S10** (`blocked: unlisted-ask`). No grill, test, build, regress or verify stage
  ran; `check-loop.mjs` was not consulted (a blocked stop). The entry gates were started and aborted unread.
- The cause, as the plan agent reported it (DATA) and as this run confirmed by reading
  `.claude/hooks/set-writes-scope.cjs`: this is an installed PHARN project, so the build's scope setter refuses a
  plan whose `## Files` names `.github/workflows/**` unless a person passes the operator flag `--allow-exec-config`
  before `--from-plan`. No plan can set that flag, so the build could not write the `ci.yml` edit AC-14 requires.
- Standing reds: none measured. `PLAN.md` and `AC-TESTS.md` were written and left in place; no `GRILL.md`,
  `REGRESSION.md` or `VERIFY.md` exists.
- The SPEC was approved by the model and reverted to Draft at this stop (`check-spec.mjs` GREEN, state Draft).

## Outcome

commit: not committed: INCONCLUSIVE
spec: reverted to Draft
blocked: unlisted-ask
ac-tests: not reached

## Handoff

### investigated

The spec agent reports (DATA) that pharn-dev/pharn-ci v0.4.0 is a published release at
`a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756`, equal to origin/main, and that v0.4.0 uses the same pnpm as 0.1.0 and
0.2.0. The plan agent reports (DATA) that it dry-ran `set-writes-scope.cjs --from-plan` on the plan and it refused
`.github/workflows/ci.yml`; this run read the setter's source and found the same rule (EXEC_CONFIG_DIRS).

### learned

In this repo an unattended build can never write a CI workflow file: the plan, the SPEC and the request cannot
grant `--allow-exec-config`; only a person running the setter can. The plan also flags (DATA) that building the three
pharn-ci clones for `regen.mjs` needs `pnpm install` and so the network, and that no existing grader targets the
agent's answer, which the AGENT_CONFIG_SECRET eval needs.

### next_steps

A person picks one: (1) make the one ci.yml edit themselves in the pharn-ci-fixtures job (a v0.4.0 checkout of
pharn-ci at `a9314e9…` into `.cache/pharn-ci-0.4.0`, a build step, and `--pharn-ci 0.4.0=.cache/pharn-ci-0.4.0` on the
regen `--check` line), then re-run with ci.yml out of the plan's files; or (2) run the build interactively
(`/pharn-ship` or `/pharn-build`) where the person runs the scope setter with `--allow-exec-config` before
`--from-plan`. The PLAN.md and AC-TESTS.md here can be reused after re-approving the SPEC.
