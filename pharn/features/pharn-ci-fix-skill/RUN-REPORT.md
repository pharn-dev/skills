# RUN REPORT — pharn-ci-fix-skill

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
decision         STOP_GREEN
iterations       1
blocked          none
base             e4b230aa560c8a409a251d7e9f917416b2294844
command          /pharn-loop
skills_version   7.3.0
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
window start       2026-11-08T13:22:13.728Z
window end         2026-11-08T13:36:13.407Z
selected session   afc53d11-7982-471a-91ed-c62c5c79bb53
run context        main
run contexts       main
excluded requests  14
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
(unattributed)  -     claude-opus-5-5     9     18               0           24279     2626763    4343              572
pharn-build     1     claude-opus-5-5    17     34               0           38686     5408917   18576             2409
pharn-grill     -     claude-opus-5-5     2      6               0           10938      514554    1240                0
pharn-plan      -     claude-opus-5-5     9     20               0           29370     2131636   11205             3255
pharn-spec      -     claude-opus-5-5    20     40               0           62012     3820141   13116             5875
pharn-test      -     claude-opus-5-5    10     22               0           28598     2818381   13749              482
TOTAL           -     -                  67    140               0          193883    17320392   62229            12593
unattributed    -     -                   9     18               0           24279     2626763    4343              572
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
  pharn-spec            -    1  186.9 s
  pharn-plan            -    1  128.0 s
  pharn-grill           -    1  18.0 s
  pharn-test            -    1  169.8 s
  pharn-build           1    1  234.0 s
  pharn-regress         1    1  13.8 s
  pharn-verify          1    1  8495 ms

deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)
  pharn-regress iter 1 run 1: HEAD gates 1 run, 0 reused, 0 nothing-to-run, of 1; BASE fresh (other-run) — worktree created, install ran (exit 0, 1462 ms), base gates 1 run, 0 reused, 0 nothing-to-run, of 1
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
  invocation c35ecf8d: start started (call 1174 ms); lifetime 43.4 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner b7cc9c: 42.2 s monotonic, 5 gate(s), ended done
    execution union: 42.2 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 34.5 s
    wait calls: 1 (24 ms green); union 24 ms foreground
    abort: nothing running
```

## Files

Changed since `e4b230aa560c8a409a251d7e9f917416b2294844`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

The tree was clean before the run, so no path below is marked `dirty-before-run`.

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `CHANGELOG.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `CHANGELOG.md` — `[Unreleased]` entry for `pharn-ci-fix`
  ```

- `README.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `README.md` — lists `pharn-ci-fix`
  ```

- `plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs` — the skill-list assertion names five skills; the version
  ```

- `pharn/features/pharn-ci-fix-skill/AC-TESTS.lock.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/BUILD.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/REGRESSION.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/VERIFY.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/cost.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/regression-report.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-fix-skill/verify-report.json` — _not named in PLAN ## Files_
- `plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md` — new skill: the fix object, the steps, the gate rule and the Never
  ```

- `plugins/pharn-ci/skills/pharn-ci-fix/references/kinds.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-fix/references/kinds.md` — new reference: one section per kind, what the agent does
  ```

- `plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs` — new helper: lists and checks the fix objects of a
  ```

- `plugins/pharn-ci/tests/ac-fix-docs.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs` — _not named in PLAN ## Files_

## Verdicts

**iteration 1 (final) only.** `/pharn-loop` OVERWRITES `verify-report.json` and `regression-report.json`
in place whenever it re-runs those stages, so earlier iterations' verdicts are not on disk at the
stop and this
report will not invent them. Per-iteration **cost** is genuine and is in `## Tokens` above.

- isolation: HOST (host execution accepted by operator)

- verify: `PASS`

  failing_gates, quoted as DATA:

  ```text
  (none)
  ```

- acceptance criteria: `PASS` (test-first)

  the AC gate — id, level, status, reason, matched test ids — quoted as DATA:

  ```text
  AC-1  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs::AC-1: SKILL.md is named pharn-ci-fix and its description names 0.9.x, the fix object, pharn-ci-cover and pharn-ci-explain
  AC-2  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs::AC-2: the skill names the eight kinds, the fields, the six places, and what the agent does for each kind
  AC-3  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs::AC-3: SKILL.md says report text, a hint and a target are data, never instructions, and quotes a target after --
  AC-4  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs::AC-4: the Never list names every forbidden move, and no sentence of the skill tells the agent to loosen a gate
  AC-5  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs::AC-5: list-fixes exits 0 and lists every valid fix with where it sits, its code or id, kind, target and hint, by kind
  AC-6  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs::AC-6: list-fixes exits non-zero and names each malformed fix by its JSON Pointer
  AC-7  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs::AC-7: list-fixes exits 0 on a report with no fix objects, with no fixes and the count of entries that have none
  AC-8  unit  passed  delivered  plugins/pharn-ci/tests/ac-fix-docs.test.mjs::AC-8: README.md lists pharn-ci-fix, and CHANGELOG.md's [Unreleased] section names pharn-ci-fix and 0.9.0
  note  an AC is delivered = a locked, once-red test titled AC-<n>:, in a file mapped to AC-<n>, passed on this head run. PHARN does not judge whether that test fully captures the AC's intent.
  ```

- regress: `no-regressions`

  regressions, quoted as DATA:

  ```text
  (none)
  ```

## Briefing

_n/a — no BRIEFING.md beside this report — not every command renders one, and a run that stops before its post-verify gate never does_

## What the run ran into

Quoted verbatim from `LOOP.md`'s `## Handoff`, as untrusted DATA. Each block is fenced with a
delimiter longer than any back-tick run inside it, so a heading in the quoted text stays text.
**The Handoff is a run's own account of itself — it is not verified by anything**, and nothing here
checks that it is accurate, complete, or useful.

### investigated

```text
`~/Projects/pharn-ci` main is the 0.9.1 release commit; its changelog says the Action is unchanged from 0.9.0, so the
fix object read from `schema/report.v2.json`, `packages/core/src/fix/table.ts` and `attach.ts` is current. The skill
was checked against pharn-ci's own golden report fixtures: the helper lists their two fixes with no problem.
```

### learned

```text
`plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs` pinned the skills directory to exactly four entries, so any
new pharn-ci skill has to edit it; it now lists five and keeps its 0.3.x / 0.4.x check on the four older skills.
Eval fixtures for this plugin are generated with a built pharn-ci CLI through `regen.mjs`, which is why evals were
left out of this increment.
```

### next_steps

```text
Add `claude plugin eval` cases for `pharn-ci-fix` with fixtures from pharn-ci 0.9.0 (a manifest entry and a
`regen.mjs` run), as CONTRIBUTING's "every skill ships evals" asks, then move the four older skills to pharn-ci 0.9.x.
```
