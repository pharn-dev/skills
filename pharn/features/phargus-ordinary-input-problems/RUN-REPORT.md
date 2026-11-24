# RUN REPORT — phargus-ordinary-input-problems

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
blocked          grill-escalation
base             2f9380a24b29f708bf2f94f0fd7c97671b6e4f84
command          /pharn-loop
skills_version   7.22.0
ledger coverage  partial
run membership   bounded
```

## Needs a person

None — the SPEC has no single `## Needs a person` section.

## Known risk

None — the supervisor decided `stop`, so the run carried no finding.

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
window start       2026-11-24T17:24:24.358Z
window end         2026-11-24T17:48:42.875Z
selected session   afdcb24d-4d8f-4468-9848-6dc623b922ff
run context        agent:a3d5d2bfa0b309b5c
run contexts       agent:a3d5d2bfa0b309b5c, agent:a5bc7daa1c7f7d0c5, agent:a61022ce6d60e85d6, agent:a7486de7a863f842c, agent:aa157a9c73e3c0044, agent:ad93346ea6bb01dcd
excluded requests  408
```

Copied from `cost.json`'s stored views, never recomputed here — `check-cost-ledger.mjs` already
holds those views to a recompute from `requests[]`, so this is one number with one owner.

**TOKENS ONLY.** There is no price table here or in `cost.json`; money is the reader's own
multiplication against their own list, and `output_thinking` is a SUBSET of `output`, not a seventh
class. `unattributed` is an honest STAGE bucket — run requests before the first stage marker — never
folded into a neighbouring stage.

```text
stage            iter  model              reqs  input  cache_write_5m  cache_write_1h  cache_read  output  output_thinking
---------------  ----  -----------------  ----  -----  --------------  --------------  ----------  ------  ---------------
(unattributed)   -     claude-opus-5-5      15     30           29532               0     2343151    4059              489
pharn-grill      -     claude-opus-5-5      43     88          243874               0     3409772   31825            13857
pharn-plan       -     claude-opus-5-5      48     98          270924               0     4547090   57378            30332
pharn-spec       -     claude-opus-5-5      28     58           77244               0     1539855   18981             6171
pharn-supervise  -     claude-opus-5-5       2      6            1565               0      304343     410                0
pharn-supervise  -     claude-sonnet-5-5    12     26           44879               0      369719    3513              575
pharn-triage     -     claude-opus-5-5       2      6            1585               0      300456     449                0
pharn-triage     -     claude-sonnet-5-5     9     18           40878               0      242964    3862             1120
TOTAL            -     -                   159    330          710481               0    13057350  120477            52544
unattributed     -     -                    15     30           29532               0     2343151    4059              489
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
  pharn-spec            -    1  228.7 s
  pharn-plan            -    1  651.7 s
  pharn-grill           -    1  387.9 s
  pharn-triage          -    1  52.4 s
  pharn-supervise       -    1  58.2 s

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
  invocation 3d4c0f3a: start started (call 556 ms); lifetime 12.7 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 799a9a: 12.1 s monotonic, 5 gate(s), ended done
    execution union: 12.1 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 8568 ms
    wait calls: none recorded
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

- `pharn/features/phargus-ordinary-input-problems/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/SUPERVISOR.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/cost.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/grill-findings.json` — _not named in PLAN ## Files_
- `pharn/features/phargus-ordinary-input-problems/grill-triage.json` — _not named in PLAN ## Files_

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
The runtime line reader, `classifyLine`, the manifest check in `summary.mjs` and capture's failure path were read by
the spec, plan and grill stages. The grill probed the planned line reader at several chunk sizes and Node's fetch
error causes on Node 22.18.0 and 24.13.1.
```

### learned

```text
Triage verdict `spec`; escalated ids G1-1, G1-2, G1-3, G1-4 (see `grill-triage.json` and `SUPERVISOR.json` for each
reason). G1-2 is the spec-level one: the SPEC constraint asks for a permanent unit test per criterion, which the
docs, changelog and checks criteria cannot meet under CONTRIBUTING. The root `npm test` gate does not run
`src/phargus/test`, so pipeline AC tests would have to live in `.github/scripts/ac-*` files.
```

### next_steps

````text
```text
supervisor verdict: {"decision":"stop","round":1,"known_risk":[]}
triage verdict: spec; escalated: G1-1, G1-2, G1-3, G1-4
```

A person narrows the SPEC constraint on per-criterion unit tests (G1-2), or the ticket is finished directly outside
the pipeline with the permanent tests in `src/phargus/test`.
````
