# RUN REPORT — collect-rules-gaps-loss

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
decision         STOP_CAP
iterations       1
blocked          none
base             248c0f6cf7571b91993fd98f8ab76eb0dc7ff503
command          /pharn-loop
skills_version   7.22.0
ledger coverage  partial
run membership   bounded
```

## Needs a person

None — the SPEC has no single `## Needs a person` section.

## Known risk

None — no finding was carried past an escalation in this run.

## SPEC amendment

None — the SPEC was not amended in this run.

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
window start       2026-11-24T18:03:26.506Z
window end         2026-11-24T18:32:15.632Z
selected session   afdcb24d-4d8f-4468-9848-6dc623b922ff
run context        agent:a72ea4278fb92be45
run contexts       agent:a1323cb495f5606fd, agent:a70a1bcad45f24ebc, agent:a72ea4278fb92be45, agent:a735f52ab4b36f07b, agent:ab507afa9d3984be7, agent:adb47069e7d68b1bf, agent:ae0d53b7369e54ba3
excluded requests  1160
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
(unattributed)  -     claude-opus-5-5      20     40           27844               0     3740036    5775              292
pharn-build     1     claude-opus-5-5       2      6          149245               0      222755     420                0
pharn-build     1     claude-sonnet-5-5    35     72          112313               0     2441808   47178             1026
pharn-grill     -     claude-opus-5-5      33     68          126731               0     2958514   18590             6967
pharn-plan      -     claude-opus-5-5      29     62          104428               0     2072493   24846             8105
pharn-spec      -     claude-opus-5-5      24     50           83366               0     1428023   18679             6410
pharn-test      -     claude-opus-5-5      44     92          252839               0     3283090   36310            11148
pharn-triage    -     claude-opus-5-5       2      6            1482               0      358949     703                0
pharn-triage    -     claude-sonnet-5-5    10     22           36972               0      242653    3117              394
TOTAL           -     -                   199    418          895220               0    16748321  155618            34342
unattributed    -     -                    20     40           27844               0     3740036    5775              292
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
  pharn-spec            -    1  237.4 s
  pharn-plan            -    1  285.0 s
  pharn-grill           -    1  251.4 s
  pharn-triage          -    1  51.7 s
  pharn-test            -    1  433.8 s
  pharn-build           1    1  354.0 s
  pharn-regress         1    1  5125 ms
  pharn-verify          1    1  4493 ms

deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)
  pharn-regress iter 1 run 1: HEAD gates 1 run, 0 reused, 0 nothing-to-run, of 1; BASE from the entry gates (no worktree, no install, 0 base gate processes; 1 results from this run's entry check)
  pharn-verify iter 1 run 1: gates 5 run, 1 reused, 0 nothing-to-run, of 6
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
  invocation 34611b20: start started (call 561 ms); lifetime 14.3 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 45c6bd: 13.7 s monotonic, 5 gate(s), ended done
    execution union: 13.7 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 9443 ms
    wait calls: 2 (39 ms green; 41 ms green); union 80 ms foreground
    abort: nothing running
```

## Files

Changed since `248c0f6cf7571b91993fd98f8ab76eb0dc7ff503`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

The tree was clean before the run, so no path below is marked `dirty-before-run`.

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `CHANGELOG.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `CHANGELOG.md` — one `phargus 0.1.1:` bullet under `## [Unreleased]` / `### Fixed` naming CORE-237
  ```

- `plugins/phargus/skills/phargus-diagnose/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/references/tools.md` — generated copy of knowledge/tools.md
  ```

- `plugins/phargus/skills/phargus-diagnose/scripts/operations.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/scripts/operations.mjs` — generated copy of runtime/operations.mjs
  ```

- `plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
  ```

- `plugins/phargus/skills/phargus-memory/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/references/tools.md` — generated copy of knowledge/tools.md
  ```

- `plugins/phargus/skills/phargus-memory/scripts/operations.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/scripts/operations.mjs` — generated copy of runtime/operations.mjs
  ```

- `plugins/phargus/skills/phargus-memory/scripts/phargus.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
  ```

- `plugins/phargus/skills/phargus-rules/references/rules.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/references/rules.md` — generated copy of knowledge/rules.md
  ```

- `plugins/phargus/skills/phargus-rules/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/references/tools.md` — generated copy of knowledge/tools.md
  ```

- `plugins/phargus/skills/phargus-rules/scripts/operations.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/scripts/operations.mjs` — generated copy of runtime/operations.mjs
  ```

- `plugins/phargus/skills/phargus-rules/scripts/phargus.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
  ```

- `plugins/phargus/skills/phargus-setup/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/references/tools.md` — generated copy of knowledge/tools.md
  ```

- `plugins/phargus/skills/phargus-setup/scripts/operations.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/scripts/operations.mjs` — generated copy of runtime/operations.mjs
  ```

- `plugins/phargus/skills/phargus-setup/scripts/phargus.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
  ```

- `plugins/phargus/skills/phargus-verify/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/references/tools.md` — generated copy of knowledge/tools.md
  ```

- `plugins/phargus/skills/phargus-verify/scripts/operations.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/scripts/operations.mjs` — generated copy of runtime/operations.mjs
  ```

- `plugins/phargus/skills/phargus-verify/scripts/phargus.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
  ```

- `src/phargus/knowledge/rules.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/knowledge/rules.md` — rules results carry `quality`; with `quality.gaps` above 0 a `forWindows` alert may span a hole
  ```

- `src/phargus/knowledge/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/knowledge/tools.md` — `--interval-ms` also applies to collect and rules (default 1000); rules ignores `--allow-logs` and its refusal names the cause; collect's quality reports gaps and loss
  ```

- `src/phargus/runtime/operations.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/runtime/operations.mjs` — collect and the window reader feed the shared quality tracker; readWindows takes trailing `intervalMs` and `status`; rules results carry `quality`; the refusal names its cause
  ```

- `src/phargus/runtime/phargus.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/runtime/phargus.mjs` — the CLI passes `--interval-ms` to collect and rules
  ```

- `pharn/features/collect-rules-gaps-loss/AC-TESTS.lock.json` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/BUILD.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/REGRESSION.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/VERIFY.md` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/cost.json` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/grill-findings.json` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/grill-triage.json` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/regression-report.json` — _not named in PLAN ## Files_
- `pharn/features/collect-rules-gaps-loss/verify-report.json` — _not named in PLAN ## Files_
- `src/phargus/test/collect-rules-quality.test.mjs` — _not named in PLAN ## Files_
- `src/phargus/test/integration/collect-rules-quality.test.mjs` — _not named in PLAN ## Files_

## Verdicts

**iteration 1 (final) only.** `/pharn-loop` OVERWRITES `verify-report.json` and `regression-report.json`
in place whenever it re-runs those stages, so earlier iterations' verdicts are not on disk at the
stop and this
report will not invent them. Per-iteration **cost** is genuine and is in `## Tokens` above.

- isolation: HOST (host execution accepted by operator)

- verify: `FAIL`

  failing_gates, quoted as DATA:

  ```text
  ac-delivery
  ```

- acceptance criteria: `FAIL` (test-first)

  the AC gate — id, level, status, reason, matched test ids — quoted as DATA:

  ```text
  AC-1  integration  none  ac-untested  (no matched test)
  AC-2  integration  none  ac-untested  (no matched test)
  AC-3  integration  none  ac-untested  (no matched test)
  AC-4  integration  none  ac-untested  (no matched test)
  AC-5  integration  none  ac-untested  (no matched test)
  AC-6  unit  none  ac-untested  (no matched test)
  AC-7  unit  none  ac-untested  (no matched test)
  AC-8  integration  none  ac-untested  (no matched test)
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
The root `package.json` `test` script does not load `src/phargus/test/`. The test stage's red run and the build's
targeted gate passed the pinned test files to that command directly, so both saw the AC tests; `/pharn-verify` runs
the bare gate, which never loads `src/phargus/test/collect-rules-quality.test.mjs` or
`src/phargus/test/integration/collect-rules-quality.test.mjs`. A rebuild cannot change this, so the cap was set to 1.
```

### learned

```text
As with the CORE-236 loop, a PHARN loop over `src/phargus` cannot reach a green verify while the root `test` gate
does not run the phargus suites. The build agent reported (DATA) that `npm test`, `npm run test:integration`,
`typecheck`, `lint`, `format:check`, `check:generated`, `check:skills` and `check:package` passed from `src/phargus`.
```

### next_steps

```text
Finish the change outside the loop: run the `src/phargus` gates directly, fold the AC tests into behaviour-named
permanent tests in the files the issue names, and commit the change with these feature artifacts.
```
