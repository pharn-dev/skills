# RUN REPORT — node-test-per-test-results

Every line below is derived by `pharn/floor/render-run-report.mjs` from artifacts this run already
produced. No line is authored by a model.

**Trust split (P2).** The values this report reads from deterministic tool output — verdicts, exit
codes, token counts, paths — are the enum-gated / floor-verifiable class. Everything shown inside a
fenced block is **free text that inherits its source's untrusted tag** and is rendered as DATA:
quoted for a person to read, never executed, and never an instruction to any later stage.

**This report ANNOTATES a run and gates nothing.** No proceed/stop anywhere reads it. It is not a
judgment that the change is good, correct, or worth its cost.

## Outcome

The `decision` below was **DERIVED** by the ledger, because `/pharn-ship` writes no
`LOOP.md` to copy one from. It is read from this run's own verdict reports and phase markers —
never from `SHIP.md` prose, which is a roll-up ABOUT a run, not a declaration of one.

**The two forms are not equally strong (P0), and this report does not average them.**

- `gate2` is **FLOOR**: it means `verify-report.json` read `PASS` **and**
  `regression-report.json` read `no-regressions` — two enum values produced by tested non-LLM
  checkers. Reaching GATE 2 hands the decision to a human; it is not itself a judgment.
- `gate2-quick` is **FLOOR too, over a SMALLER stage set**: a `--quick` run whose OWN `pharn-verify`
  stage-start read `PASS` at its latest iteration. **`gate2-quick` is NOT `gate2`** — quick mode
  starts no `/pharn-regress` at all, so no regression verdict is read, ever, for this decision; a
  `regression-report.json` left on disk by an earlier run is never consulted.
- `stop:<stage>` is **ADVISORY** in its stage NAME: `<stage>` is the last `stage-start` marker,
  and markers are written by Bash calls in command prose, outside the `PreToolUse` gate — so a
  written marker does not mean the stage ran, nor the reverse. That the run did **not** meet the
  `gate2`/`gate2-quick` test is a membership fact; which stage it stopped at rests on marker
  discipline.
- `stop:unknown` is the terminal fallback: markers exist but none is a `stage-start`.
- `undetermined` means the run's own boundary could not be established from its markers, so no
  verdict could be bound to THIS run — including a run that starts a non-verdict stage twice at one
  iteration, which is what a skipped run-start can leave behind. It is neither a failed check nor a
  stop stage.

**Only verdicts that belong to THIS run count.** The stage set `gate2`/`gate2-quick` requires is the
run's OWN mode (read from its run-start marker, never from the SPEC): a FULL run must have STARTED
both `pharn-regress` and `pharn-verify` at its latest iteration; a QUICK run needs only
`pharn-verify` — quick mode never starts `/pharn-regress`, so demanding it would make `gate2-quick`
unreachable. Either way each one counts only AFTER that iteration's latest `pharn-build`
stage-start, and reports an earlier run or attempt left on disk are excluded. This is exact
relative to the recorded markers, which are themselves ADVISORY, and a stage that started but
refused before rewriting its report is NOT detected.

**Neither form says the outcome was correct.** Unlike `/pharn-loop`, whose recorded decision
`check-loop-decision.mjs` re-derives from its own cited reports, there is no equivalent
re-derivation here and none is claimed — a ship stop is a human gate or an orchestrator STOP, and
no checker computes either.

```text
decision         stop:pharn-verify
iterations       1
blocked          none
base             c99fa521b97925c944588c2301cc5f0820794614
command          /pharn-ship
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
window start       2026-10-27T12:04:20.504Z
window end         2026-10-27T13:56:19.827Z
selected session   d6b8cce2-8051-49f5-9226-e78812aa0b46
run context        main
run contexts       agent:a17e1da2a05e48e62, agent:a3eb498a235fb989f, agent:a7f520cb5f63dd6ce, agent:a8b8432fbc2f919d9, main
excluded requests  263
```

Copied from `cost.json`'s stored views, never recomputed here — `check-cost-ledger.mjs` already
holds those views to a recompute from `requests[]`, so this is one number with one owner.

**TOKENS ONLY.** There is no price table here or in `cost.json`; money is the reader's own
multiplication against their own list, and `output_thinking` is a SUBSET of `output`, not a seventh
class. `unattributed` is an honest STAGE bucket — run requests before the first stage marker — never
folded into a neighbouring stage.

```text
stage           iter  model              reqs  input  cache_write_5m  cache_write_1h  cache_read  output  output_thinking
--------------  ----  -----------------  ----  -----  --------------  --------------  ----------  ------  ---------------
(unattributed)  -     claude-opus-5-5      48    112               0          399317    16586477   23975             7598
pharn-build     1     claude-opus-5-5       3      8               0            2155     1060028     383                0
pharn-build     1     claude-sonnet-5-5    21     42          107245               0     1881766   11813             1638
pharn-grill     -     claude-opus-5-5      43     88          145478            2256     6339647   28933            13780
pharn-plan      -     claude-opus-5-5      32     66          107388            3324     4166671   26508            11730
pharn-test      -     claude-opus-5-5      11     24           43763            1589     1608167    2285               42
TOTAL           -     -                   158    340          403874          408641    31642756   93897            34788
unattributed    -     -                    48    112               0          399317    16586477   23975             7598
```

**Always-loaded instruction set — an ESTIMATE, not a measurement.**

_n/a — no `pharn/.run/pharn-loop/node-test-per-test-results/instruction-files.json` — `/pharn-loop` records it at Step 1a (`check-instruction-files.mjs --report`); `/pharn-ship` records none_

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
  pharn-plan            -    1  351.0 s
  pharn-grill           -    1  403.5 s
  pharn-test            -    1  49.2 s
  pharn-build           1    1  156.1 s
  pharn-regress         1    1  11.8 s
  pharn-verify          1    1  9368 ms

deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)
  pharn-regress iter 1 run 1: HEAD gates 1 run, 0 reused, 0 nothing-to-run, of 1; BASE fresh (no-record) — worktree created, install ran (exit 0, 810 ms), base gates 1 run, 0 reused, 0 nothing-to-run, of 1
  pharn-verify iter 1 run 1: gates 6 run, 0 reused, 0 nothing-to-run, of 6
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
  invocation fe8e4080: start started (call 326 ms); lifetime 13.5 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 704758: 13.1 s monotonic, 5 gate(s), ended done
    execution union: 13.1 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 12.9 s
    wait calls: 2 (16 ms green; 19 ms green); union 36 ms foreground
    abort: nothing running
```

## Files

Changed since `c99fa521b97925c944588c2301cc5f0820794614`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

_n/a — no pre-run snapshot was found, so no path can be marked `dirty-before-run`_

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `.github/workflows/ci.yml` — _not named in PLAN ## Files_
- `CONTRIBUTING.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `CONTRIBUTING.md` — a short note on the reporter and on the `pharn.config.json` line being the person's edit
  ```

- `package.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `package.json` — the `test` script gains the `spec` reporter and the custom reporter, both to stdout; the globs are unchanged
  ```

- `pharn.config.json` — _not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4/entry.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4/markers.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/result.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/runner.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4/pre-run-status.txt` — _not named in PLAN ## Files_
- `.github/scripts/pharn-test-reporter.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `.github/scripts/pharn-test-reporter.mjs` — new: the Node-core `node:test` reporter that writes the `pharn-json` document to `PHARN_TEST_RESULTS`
  ```

- `.github/scripts/pharn-test-reporter.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `.github/scripts/pharn-test-reporter.test.mjs` — new: integration tests of the reporter through the `test` script's reporter flags
  ```

- `pharn/.run/cost/node-test-per-test-results/entry.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/node-test-per-test-results/markers.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/node-test-per-test-results/work.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4-2/entry.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4-2/markers.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4-3/entry.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4-3/markers.jsonl` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full.times.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/0-test.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/0-test.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/0-test.test-results.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/1-lint.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/1-lint.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/2-format_check.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/2-format_check.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/3-lint_md.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/3-lint_md.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/full/stamp.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/targeted.times.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/targeted/0-test.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/targeted/0-test.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/targeted/0-test.test-results.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/targeted/stamp.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-build/node-test-per-test-results/targets.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/base-tests.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/0-lint.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/0-lint.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/1-format_check.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/1-format_check.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/2-lint_md.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/2-lint_md.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/3-base_test.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/3-base_test.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/4-test.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/4-test.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/gates/stamp.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-entry/progress.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-2/instruction-files.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-2/isolation.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-2/pre-run-status.txt` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-3/instruction-files.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-3/isolation.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4-3/pre-run-status.txt` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/base-gates/0-test.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/base-gates/0-test.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/base-gates/stamp.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/head-install.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/head/0-test.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/head/0-test.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/head/0-test.test-results.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/head/stamp.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/install.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/install.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-regress/scope.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/0-test.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/0-test.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/0-test.test-results.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/1-lint.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/1-lint.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/2-format_check.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/2-format_check.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/3-lint_md.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/3-lint_md.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/4-instruction-growth.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/4-instruction-growth.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/5-reconcile.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/5-reconcile.out` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/completeness.err` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/completeness.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/gates/stamp.json` — _not named in PLAN ## Files_
- `pharn/.run/pharn-verify/head-install.json` — _not named in PLAN ## Files_
- `pharn/.run/reconcile/baseline.json` — _not named in PLAN ## Files_
- `pharn/.run/seam-config.json` — _not named in PLAN ## Files_
- `pharn/.run/writes-scope.json` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/AC-TESTS.lock.json` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/BUILD.md` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/REGRESSION.md` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/SHIP.md` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/VERIFY.md` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/cost.json` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/regression-report.json` — _not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/verify-report.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/RUN-REPORT.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/cost.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/RUN-REPORT.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/cost.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/RUN-REPORT.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/cost.json` — _not named in PLAN ## Files_

## Verdicts

**iteration 1 (final) only.** `/pharn-ship` OVERWRITES `verify-report.json` and `regression-report.json`
in place whenever it re-runs those stages, so earlier iterations' verdicts are not on disk at the
stop and this
report will not invent them. Per-iteration **cost** is genuine and is in `## Tokens` above.

- isolation: n/a — `/pharn-ship` runs no isolation check (a person approves its SPEC)

- verify: `FAIL`

  failing_gates, quoted as DATA:

  ```text
  reconcile
  ```

- reconcile — why the gate failed:

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

- acceptance criteria: `PASS` (bootstrap)

  the AC gate — id, level, status, reason, matched test ids — quoted as DATA:

  ```text
  AC-1  integration  passed  delivered  (no matched test)
  AC-2  integration  passed  delivered  (no matched test)
  AC-3  integration  passed  delivered  (no matched test)
  AC-4  integration  passed  delivered  (no matched test)
  AC-5  integration  passed  delivered  (no matched test)
  AC-6  integration  passed  delivered  (no matched test)
  AC-7  integration  passed  delivered  (no matched test)
  note  BOOTSTRAP evidence (spec_kind: test-infra) — WEAKER than test-first: each level's gate ran as discovered and reported at least one passed test; no AC test was shown red before the build.
  ```

- regress: `no-regressions`

  regressions, quoted as DATA:

  ```text
  (none)
  ```

## Briefing

_n/a — no BRIEFING.md beside this report — not every command renders one, and a run that stops before its post-verify gate never does_

## What the run ran into

_n/a — `/pharn-ship` writes no `LOOP.md`, so this run has no Handoff BY DESIGN — nothing is missing_
