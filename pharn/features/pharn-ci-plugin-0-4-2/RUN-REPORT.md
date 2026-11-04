# RUN REPORT — pharn-ci-plugin-0-4-2

Every line below is derived by `pharn/floor/render-run-report.mjs` from artifacts this run already
produced. No line is authored by a model.

**Trust split (P2).** The values this report reads from deterministic tool output — verdicts, exit
codes, token counts, paths — are the enum-gated / floor-verifiable class. Everything shown inside a
fenced block is **free text that inherits its source's untrusted tag** and is rendered as DATA:
quoted for a person to read, never executed, and never an instruction to any later stage.

**This report ANNOTATES a run and gates nothing.** No proceed/stop anywhere reads it. It is not a
judgment that the change is good, correct, or worth its cost.

## Outcome

The `decision` below is copied verbatim from `LOOP.md`'s frontmatter by the ledger; this report
introduces no second source of truth for it.

```text
decision         INCONCLUSIVE
iterations       1
blocked          unlisted-ask
base             c99fa521b97925c944588c2301cc5f0820794614
command          /pharn-loop
skills_version   7.1.4
ledger coverage  partial
run membership   bounded
```

## Tokens — stage x iteration x model

**Measured population: the RUN'S OWN CONTEXTS inside its window** (`run-window/2`) — only requests of the
selected session that fall inside the window below AND come from the context that printed the run's
markers or an agent that context tree spawned during the run. Earlier and later activity in that session,
and other contexts working inside the window (a concurrent run, its agents, the main thread), are excluded
and counted, never summed. This is NOT a feature's lifetime cost, other sessions' requests are not
collected, and the request that opened the window falls just before it. A floor on this run's spend,
never the total.

```text
status             bounded
method             run-window/2
window start       2026-10-27T11:30:21.025Z
window end         2026-10-27T11:48:04.275Z
selected session   d6b8cce2-8051-49f5-9226-e78812aa0b46
run context        main
run contexts       agent:ac13f7bcbff409c02, agent:af9a5d3082e248059, main
excluded requests  54
```

Copied from `cost.json`'s stored views, never recomputed here — `check-cost-ledger.mjs` already
holds those views to a recompute from `requests[]`, so this is one number with one owner.

**TOKENS ONLY.** There is no price table here or in `cost.json`; money is the reader's own
multiplication against their own list, and `output_thinking` is a SUBSET of `output`, not a seventh
class. `unattributed` is an honest STAGE bucket — run requests before the first stage marker — never
folded into a neighbouring stage.

```text
stage           iter  model            reqs  input  cache_write_5m  cache_write_1h  cache_read  output  output_thinking
--------------  ----  ---------------  ----  -----  --------------  --------------  ----------  ------  ---------------
(unattributed)  -     claude-opus-5-5    14     28             206            9142     2865562    6277              716
pharn-plan      -     claude-opus-5-5    58    116          234152            3425    10441422   58238            26832
pharn-spec      -     claude-opus-5-5    34     68          103180            2952     3756794   19829             4082
TOTAL           -     -                 106    212          337538           15519    17063778   84344            31630
unattributed    -     -                  14     28             206            9142     2865562    6277              716
```

**Always-loaded instruction set — an ESTIMATE, not a measurement.**

~0 tokens (0 bytes over 0 file(s)), taken once at the run's start by `pharn/floor/check-instruction-files.mjs --report`. The figure is bytes / 4 (`pharn/LIMITS.md §1c`) over that checker's
model of what Claude Code loads into every context (`pharn/LIMITS.md §3e`) — a model, not a measurement of the loader.
By that model those files ride in the prefix of the run's requests, so they would already sit inside the input
and cache counts above — never add this figure to them.

## Stage elapsed and deterministic work

**Observed elapsed** is wall-clock time between two PHARN markers — the stage's start and the orchestrator's
return — read by two different processes. It is NOT CPU time, model time or tool time, it is not monotonic, and
it includes orchestration, subprocesses, waiting and any answer a human gave inside the stage. An `unmeasured`
row names why no interval could be paired, and is never a zero. **Deterministic work** is counted from each
`/pharn-regress` and `/pharn-verify` execution's own gate-run stamp at its `done` exit; an execution that ended any
other way recorded none. Nothing here is subtracted from anything else.

```text
observed elapsed — wall clock between PHARN's stage markers (not CPU, model or tool time; not monotonic)
  stage              iter  run  elapsed
  pharn-spec            -    1  276.0 s
  pharn-plan            -    1  697.3 s

deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)
  (no /pharn-regress or /pharn-verify execution recorded one in this run)
```

## Entry gates (background)

The **entry check** runs the project's gates in a background process while the spec, plan and grill stages work.
Its **lifetime** runs from `--start` to the record of the process that ended it: wall clock across processes,
placement only, not CPU or gate time. A **segment** is one runner or takeover process, timed on its own monotonic
clock. A **wait call** is the foreground time one `--wait` line took, and a takeover runs inside it and is never
added to it. Totals are interval unions, never sums. `INCOMPLETE` means no end was recorded before the run-stop
marker, and it is never a zero.

```text
entry gates — the background check, observed apart from the stage rows (never added to them)
  invocation 2a99446b: start started (call 323 ms); lifetime 10.7 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 492e3f: 10.4 s monotonic, 5 gate(s), ended done
    execution union: 10.4 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 3614 ms
    wait calls: none recorded
    abort: nothing running
```

## Files

Changed since `c99fa521b97925c944588c2301cc5f0820794614`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

23 path(s) were already dirty before the run started; those are marked below.

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `pharn/.run/cost/pharn-ci-plugin-0-4/entry.jsonl` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4/markers.jsonl` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/result.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/runner.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4/pre-run-status.txt` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4-2/entry.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4-2/markers.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/base-tests.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/0-lint.err` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/0-lint.out` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/1-format_check.err` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/1-format_check.out` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/2-lint_md.err` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/2-lint_md.out` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/3-base_test.err` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/3-base_test.out` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/4-test.err` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/4-test.out` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/stamp.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/progress.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-2/active.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-2/instruction-files.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-2/isolation.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-2/pre-run-status.txt` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/writes-scope.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/cost.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/LOOP.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/RUN-REPORT.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/SPEC.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/cost.json` — _dirty-before-run; not named in PLAN ## Files_

## Verdicts

**iteration 1 (final) only.** `/pharn-loop` OVERWRITES `verify-report.json` and `regression-report.json`
in place whenever it re-runs those stages, so earlier iterations' verdicts are not on disk at the
stop and this
report will not invent them. Per-iteration **cost** is genuine and is in `## Tokens` above.

- isolation: HOST (host execution accepted by operator)

- verify: _n/a — no verify-report.json — the run stopped before a verify, or it was blocked_
- regress: _n/a — no regression-report.json — the run stopped before a regress, or it was blocked_

## Briefing

_n/a — no BRIEFING.md beside this report — not every command renders one, and a run that stops before its post-verify gate never does_

## What the run ran into

Quoted verbatim from `LOOP.md`'s `## Handoff`, as untrusted DATA. Each block is fenced with a
delimiter longer than any back-tick run inside it, so a heading in the quoted text stays text.
**The Handoff is a run's own account of itself — it is not verified by anything**, and nothing here
checks that it is accurate, complete, or useful.

### investigated

```text
The spec agent reports (DATA) that pharn-dev/pharn-ci v0.4.0 is a published release at
`a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756`, equal to origin/main, and that v0.4.0 uses the same pnpm as 0.1.0 and
0.2.0. The plan agent reports (DATA) that it dry-ran `set-writes-scope.cjs --from-plan` on the plan and it refused
`.github/workflows/ci.yml`; this run read the setter's source and found the same rule (EXEC_CONFIG_DIRS).
```

### learned

```text
In this repo an unattended build can never write a CI workflow file: the plan, the SPEC and the request cannot
grant `--allow-exec-config`; only a person running the setter can. The plan also flags (DATA) that building the three
pharn-ci clones for `regen.mjs` needs `pnpm install` and so the network, and that no existing grader targets the
agent's answer, which the AGENT_CONFIG_SECRET eval needs.
```

### next_steps

```text
A person picks one: (1) make the one ci.yml edit themselves in the pharn-ci-fixtures job (a v0.4.0 checkout of
pharn-ci at `a9314e9…` into `.cache/pharn-ci-0.4.0`, a build step, and `--pharn-ci 0.4.0=.cache/pharn-ci-0.4.0` on the
regen `--check` line), then re-run with ci.yml out of the plan's files; or (2) run the build interactively
(`/pharn-ship` or `/pharn-build`) where the person runs the scope setter with `--allow-exec-config` before
`--from-plan`. The PLAN.md and AC-TESTS.md here can be reused after re-approving the SPEC.
```
