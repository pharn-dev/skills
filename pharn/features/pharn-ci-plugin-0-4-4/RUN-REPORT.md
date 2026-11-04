# RUN REPORT — pharn-ci-plugin-0-4-4

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
blocked          stage-refused
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
window start       2026-10-27T13:58:37.299Z
window end         2026-10-28T21:43:18.398Z
selected session   d6b8cce2-8051-49f5-9226-e78812aa0b46
run context        main
run contexts       agent:a27de2f3a01b9a9ae, agent:a682ee458ecfc520e, agent:a6a832269d65ac410, agent:acde608ba0ce0cd29, main
excluded requests  434
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
(unattributed)  -     claude-opus-5-5      12     26             198            9007     5096533    6827              831
(unattributed)  -     claude-sonnet-5-5     2      4            2721               0      646967     190                0
pharn-build     1     claude-opus-5-5      12     26             189          416941     4723311    6246             2058
pharn-build     1     claude-sonnet-5-5    56    114          643872               0    12702720   35318            13825
pharn-grill     -     claude-opus-5-5       2      4             471            1440      618708    2198                0
pharn-plan      -     claude-opus-5-5      24     48          146547            3255     3581563   30761             4198
pharn-spec      -     claude-opus-5-5      28     56          148327            3855     3645621   18369             3459
pharn-test      -     claude-opus-5-5      42     84          136391             810     6093921   44563            17348
TOTAL           -     -                   178    362         1078716          435308    37109344  144472            41719
unattributed    -     -                    14     30            2919            9007     5743500    7017              831
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
  pharn-spec            -    1  260.4 s
  pharn-plan            -    1  313.5 s
  pharn-grill           -    1  8482 ms
  pharn-test            -    1  508.1 s
  pharn-build           1    1  113075.1 s

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
  invocation a8783d80: start started (call 365 ms); lifetime 11.1 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 6ab8b5: 10.7 s monotonic, 5 gate(s), ended done
    execution union: 10.7 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 10.5 s
    wait calls: 1 (20 ms green); union 19 ms foreground
    abort: nothing running
```

## Files

Changed since `c99fa521b97925c944588c2301cc5f0820794614`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

48 path(s) were already dirty before the run started; those are marked below.

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `.github/workflows/ci.yml` — _dirty-before-run; not named in PLAN ## Files_
- `.gitignore` — _dirty-before-run; not named in PLAN ## Files_
- `CONTRIBUTING.md` — _dirty-before-run_

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `CONTRIBUTING.md` — three fixture pins, regen command, sameAs pair, policy schema re-sync step; the person's reporter paragraph kept byte-for-byte
  ```

- `package.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn.config.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/cost/add-package-json/entry.jsonl` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/cost/add-package-json/markers.jsonl` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4/entry.jsonl` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/cost/pharn-ci-plugin-0-4/markers.jsonl` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/result.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-entry/runner.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/add-package-json/instruction-files.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/add-package-json/isolation.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/add-package-json/pre-run-status.txt` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4/instruction-files.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4/isolation.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/.run/pharn-loop/pharn-ci-plugin-0-4/pre-run-status.txt` — _dirty-before-run; not named in PLAN ## Files_
- `plugins/pharn-ci/.claude-plugin/plugin.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/.claude-plugin/plugin.json` — version 0.2.0; description mentions writing an org policy
  ```

- `plugins/pharn-ci/evals/install-existing-ci/graders/pin-ci.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/install-existing-ci/graders/pin-ci.md` — v0.4.0 pin
  ```

- `plugins/pharn-ci/evals/install-fork-comments/graders/pin-pharn-ci-comment.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/install-fork-comments/graders/pin-pharn-ci-comment.md` — v0.4.0 pin
  ```

- `plugins/pharn-ci/evals/install-fork-comments/graders/pin-pharn-ci.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/install-fork-comments/graders/pin-pharn-ci.md` — v0.4.0 pin
  ```

- `plugins/pharn-ci/evals/install-missing-dependency/graders/pin-pharn-ci.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/install-missing-dependency/graders/pin-pharn-ci.md` — v0.4.0 pin
  ```

- `plugins/pharn-ci/evals/install-monorepo-root/graders/pin-pharn-ci.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/install-monorepo-root/graders/pin-pharn-ci.md` — v0.4.0 pin
  ```

- `plugins/pharn-ci/evals/install-node-default/graders/pin-pharn-ci.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/install-node-default/graders/pin-pharn-ci.md` — v0.4.0 pin
  ```

- `plugins/pharn-ci/evals/install-test-integrity/graders/pin-pharn-ci.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/install-test-integrity/graders/pin-pharn-ci.md` — v0.4.0 pin
  ```

- `plugins/pharn-ci/skills/pharn-ci-cover/scripts/check-lines.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-cover/scripts/check-lines.mjs` — comments only: shared block and isKnownSchemaVersion doc
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md` — 0.3.0 TI codes, A7 secret codes, AGENT_PR_DETECTION_INCOMPLETE, UPLOAD_TOO_LARGE
  ```

- `plugins/pharn-ci/skills/pharn-ci-install/SKILL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-install/SKILL.md` — v0.4.0 pin, 0.1.x–0.4.x range, existing 0.2.x/0.3.x pins, opt-in policy
  ```

- `plugins/pharn-ci/skills/pharn-ci-install/references/coverage.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-install/references/coverage.md` — version wording (coverage unchanged through 0.4.0)
  ```

- `plugins/pharn-ci/skills/pharn-ci-install/references/workflows.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-install/references/workflows.md` — v0.4.0 pins; appended opt-in org-policy section (policy input, id-token, upload, file:)
  ```

- `plugins/pharn-ci/skills/pharn-ci-install/scripts/check-coverage.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-install/scripts/check-coverage.mjs` — comments only: shared block and header name 0.4.0 / a9314e9
  ```

- `.github/scripts/pharn-test-reporter.mjs` — _dirty-before-run; not named in PLAN ## Files_
- `.github/scripts/pharn-test-reporter.test.mjs` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/AC-TESTS.lock.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/BUILD.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/GRILL.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/PLAN.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/REGRESSION.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/RUN-REPORT.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/SHIP.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/SPEC.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/VERIFY.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/cost.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/regression-report.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/node-test-per-test-results/verify-report.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/AC-TESTS.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/LOOP.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/PLAN.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/RUN-REPORT.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/SPEC.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-2/cost.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/AC-TESTS.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/GRILL.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/LOOP.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/PLAN.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/RUN-REPORT.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/SPEC.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-3/cost.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/AC-TESTS.lock.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/cost.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/LOOP.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/RUN-REPORT.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/SPEC.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/cost.json` — _dirty-before-run; not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-descriptions.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-docs.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-evals.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-explain.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-install-policy.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-no-loosening.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-pins.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-policy-skill.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-4-test-suites.test.mjs` — _not named in PLAN ## Files_

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
The per-test results setup worked: the test stage's preflight passed and all 15 AC tests were written and shown
failing before the build (test-first). The plan stage agent reports (DATA) that the plan's 98 files exclude the
person's ci.yml, .gitignore, pharn.config.json, reporter and package.json test script.
```

### learned

```text
A routed stage agent that outlives the session cannot be finished by the same run: `finish` caps its wait one hour
after the stage's start and then closes the stage as `no-result`, even if the agent is resumed. Resuming the agent
before running `finish` only let it write more into a stage that was already closed.
```

### next_steps

```text
A person decides what to do with the partial build: keep the 14 edited plugin files and re-run (a new run's plan
builds on the current tree, and `pharn/features/pharn-ci-plugin-0-4-4`'s pinned AC tests already claim their file
names, so either remove that run's AC-TESTS.md and tests first or let the new run pick new names), or restore them
with `git checkout -- plugins/pharn-ci` before re-running. Then re-run `/pharn-loop --accept-host-execution` in one
sitting, so no routed stage outlives its session.
```
