# RUN REPORT — phargus-summary-bounded-memory

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
iterations       2
blocked          stage-refused
base             2f9380a24b29f708bf2f94f0fd7c97671b6e4f84
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
window start       2026-11-24T17:25:32.333Z
window end         2026-11-24T18:01:47.590Z
selected session   afdcb24d-4d8f-4468-9848-6dc623b922ff
run context        agent:a26d0ccf7a29a7b90
run contexts       agent:a05bb58fd1a75221f, agent:a2337feaabb5a772b, agent:a26d0ccf7a29a7b90, agent:a81110734a9144895, agent:a9d89e7ca98fac4bc, agent:ac6b78dc8a942cc85, agent:add2c3e136f2d7413, agent:af175c4336a9b7693
excluded requests  572
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
(unattributed)  -     claude-opus-5-5      26     54           43693               0     4811494    7877             1331
pharn-build     1     claude-opus-5-5       2      6          145312               0      218168     425                0
pharn-build     1     claude-sonnet-5-5    32     68          154811               0     2789595   87786             1282
pharn-build     2     claude-opus-5-5       2      6            2126               0      374412     473                0
pharn-build     2     claude-sonnet-5-5    12     24           58540               0      496496    4635             1116
pharn-grill     -     claude-opus-5-5      34     70          264184               0     3126459   28548             9745
pharn-plan      -     claude-opus-5-5      36     74          253389               0     2838273   36105            17220
pharn-spec      -     claude-opus-5-5      26     54           78756               0     1573683   18942             7098
pharn-test      -     claude-opus-5-5      39     82          234114               0     2645500   31484             9123
pharn-triage    -     claude-opus-5-5       2      6            1928               0      343072     499                0
pharn-triage    -     claude-sonnet-5-5    10     22           42545               0      269952    4214             1043
TOTAL           -     -                   221    466         1279398               0    19487104  220988            47958
unattributed    -     -                    26     54           43693               0     4811494    7877             1331
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
  pharn-spec            -    1  229.5 s
  pharn-plan            -    1  400.0 s
  pharn-grill           -    1  352.6 s
  pharn-triage          -    1  61.0 s
  pharn-test            -    1  367.1 s
  pharn-build           1    1  523.0 s
  pharn-regress         1    1  4556 ms
  pharn-verify          1    1  4755 ms
  pharn-build           2    1  72.5 s

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
  invocation 874a0b04: start started (call 638 ms); lifetime 14.2 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 797e34: 13.6 s monotonic, 5 gate(s), ended done
    execution union: 13.6 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 8684 ms
    wait calls: 2 (43 ms green; 41 ms green); union 83 ms foreground
    abort: nothing running
```

## Files

Changed since `2f9380a24b29f708bf2f94f0fd7c97671b6e4f84`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

The tree was clean before the run, so no path below is marked `dirty-before-run`.

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `CHANGELOG.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `CHANGELOG.md` — one `` `phargus` 0.1.1: `` bullet under `[Unreleased]` → `### Fixed`
  ```

- `plugins/phargus/skills/phargus-diagnose/references/data.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/references/data.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-diagnose/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/references/tools.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-diagnose/scripts/records.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/scripts/records.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-memory/references/data.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/references/data.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-memory/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/references/tools.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-memory/scripts/records.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/scripts/records.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-memory/scripts/summary.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-memory/scripts/types.d.ts`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-memory/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-rules/references/data.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/references/data.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-rules/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/references/tools.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-rules/scripts/records.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/scripts/records.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-rules/scripts/summary.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-rules/scripts/types.d.ts`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-rules/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-setup/references/data.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/references/data.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-setup/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/references/tools.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-setup/scripts/records.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/scripts/records.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-setup/scripts/summary.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-setup/scripts/types.d.ts`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-setup/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-verify/references/data.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/references/data.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-verify/references/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/references/tools.md` — generated copy of the knowledge file, byte-identical
  ```

- `plugins/phargus/skills/phargus-verify/scripts/records.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/scripts/records.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-verify/scripts/summary.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
  ```

- `plugins/phargus/skills/phargus-verify/scripts/types.d.ts`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/phargus/skills/phargus-verify/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
  ```

- `src/phargus/knowledge/data.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/knowledge/data.md` — lines 26-28: the cap, `(other)`, `routesFolded`, `distinctRoutes is a lower bound`
  ```

- `src/phargus/knowledge/tools.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/knowledge/tools.md` — lines 62-64: the cap, `(other)`, `routesFolded`, `distinctRoutes is a lower bound`
  ```

- `src/phargus/runtime/records.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/runtime/records.mjs` — correct the `fileEvents` comment at lines 175-177 only
  ```

- `src/phargus/runtime/summary.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/runtime/summary.mjs` — route ids from one `routeIndex()` function, a 10,000-route cap with an `(other)` route, numbers-only span storage, one-pass selection, `requests.routesFolded`
  ```

- `src/phargus/runtime/types.d.ts`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `src/phargus/runtime/types.d.ts` — `routesFolded: boolean` after `distinctRoutes` in `Summary['requests']`
  ```

- `pharn/features/phargus-summary-bounded-memory/AC-TESTS.lock.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/BUILD.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/REGRESSION.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/VERIFY.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/cost.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/grill-findings.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/grill-triage.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/regression-report.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-summary-bounded-memory/verify-report.json` — _not named in PLAN ## Files_
- `src/phargus/test/route-cap-docs.test.mjs` — _not named in PLAN ## Files_
- `src/phargus/test/summary-bounded-memory.test.mjs` — _not named in PLAN ## Files_
- `src/phargus/test/summary-route-cap.test.mjs` — _not named in PLAN ## Files_

## Verdicts

**iteration 2 (final) only.** `/pharn-loop` OVERWRITES `verify-report.json` and `regression-report.json`
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
  AC-1  unit  none  ac-untested  (no matched test)
  AC-2  unit  none  ac-untested  (no matched test)
  AC-3  unit  none  ac-untested  (no matched test)
  AC-4  unit  none  ac-untested  (no matched test)
  AC-5  unit  none  ac-untested  (no matched test)
  AC-6  integration  none  ac-untested  (no matched test)
  AC-7  integration  none  ac-untested  (no matched test)
  AC-8  unit  none  ac-untested  (no matched test)
  AC-9  unit  none  ac-untested  (no matched test)
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
The root `package.json` `test` script globs `.github/scripts`, `plugins/pharn-ci/tests` and
`plugins/pharn-ci/evals/fixtures` only; `src/phargus` has its own `npm test` and `npm run test:integration`. The grill
measured today's `summarize --file` on 200,000 unique-path spans at `--max-old-space-size=64`: exit 134.
```

### learned

```text
pharn-loop cannot reach STOP_GREEN for a `src/phargus` feature in this repo: its verify AC gate reads the root `test`
gate, which never loads `src/phargus/test/`. The build's code is complete per verify's completeness check and passes
the src/phargus gates as reported by the build stage (DATA).
```

### next_steps

```text
Finish the ticket directly: keep the build's code, run every src/phargus gate (format:check, lint, typecheck, test,
test:integration, check:generated, check:skills, check:package) and the root lint:md/format:check, do the 1.1 GB manual
checks, and open the PR with these artifacts.
```
