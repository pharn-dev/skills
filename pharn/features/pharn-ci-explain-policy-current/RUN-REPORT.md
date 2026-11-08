# RUN REPORT — pharn-ci-explain-policy-current

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
iterations       3
blocked          none
base             d8b6d2bcd5de4426e07dba841bf5e8d4a941ad34
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
window start       2026-11-08T14:14:56.783Z
window end         2026-11-08T15:13:50.413Z
selected session   62bd2792-1fb7-44e4-a731-59596eccb1c3
run context        main
run contexts       main
excluded requests  19
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
(unattributed)  -     claude-opus-5-5    18     36               0           13807     9648223    7286              929
pharn-build     1     claude-opus-5-5   102    204               0          234879    51218488  115922            22113
pharn-build     2     claude-opus-5-5     3      6               0            1856     1826517    1298               62
pharn-build     3     claude-opus-5-5     2      4               0            1308     1223940     917                0
pharn-grill     -     claude-opus-5-5     3      8               0           10860      982841    1323                0
pharn-plan      -     claude-opus-5-5    24     50               0           81186     6738058   23421             7484
pharn-spec      -     claude-opus-5-5    34     70               0           98478     6600832   24003            10143
pharn-test      -     claude-opus-5-5    22     46               0           32380     7815514   16993             1366
TOTAL           -     -                 208    424               0          474754    86054413  191163            42097
unattributed    -     -                  18     36               0           13807     9648223    7286              929
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
  pharn-spec            -    1  322.9 s
  pharn-plan            -    1  290.3 s
  pharn-grill           -    1  28.9 s
  pharn-test            -    1  267.1 s
  pharn-build           1    1  2359.4 s
  pharn-regress         1    1  13.6 s
  pharn-verify          1    1  10.2 s
  pharn-build           2    1  32.7 s
  pharn-regress         2    1  5996 ms
  pharn-verify          2    1  8726 ms
  pharn-build           3    1  24.5 s
  pharn-regress         3    1  5771 ms
  pharn-verify          3    1  8672 ms

deterministic work — gate processes run vs taken from reused evidence (counted from each stage's gate-run stamp)
  pharn-regress iter 1 run 1: HEAD gates 1 run, 0 reused, 0 nothing-to-run, of 1; BASE fresh (no-record) — worktree created, install ran (exit 0, 1248 ms), base gates 1 run, 0 reused, 0 nothing-to-run, of 1
  pharn-verify iter 1 run 1: gates 6 run, 0 reused, 0 nothing-to-run, of 6
  pharn-regress iter 2 run 1: HEAD gates 1 run, 0 reused, 0 nothing-to-run, of 1; BASE REUSED (no worktree, no install, 0 base gate processes; 1 results from earlier evidence)
  pharn-verify iter 2 run 1: gates 6 run, 0 reused, 0 nothing-to-run, of 6
  pharn-regress iter 3 run 1: HEAD gates 1 run, 0 reused, 0 nothing-to-run, of 1; BASE REUSED (no worktree, no install, 0 base gate processes; 1 results from earlier evidence)
  pharn-verify iter 3 run 1: gates 6 run, 0 reused, 0 nothing-to-run, of 6
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
  invocation 4d3749bc: start started (call 382 ms); lifetime 15.5 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 225c40: 15.1 s monotonic, 5 gate(s), ended done
    execution union: 15.1 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 9713 ms
    wait calls: 1 (73 ms green); union 73 ms foreground
    abort: nothing running
```

## Files

Changed since `d8b6d2bcd5de4426e07dba841bf5e8d4a941ad34`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

The tree was clean before the run, so no path below is marked `dirty-before-run`.

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `plugins/pharn-ci/evals/fixtures/manifest.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/fixtures/manifest.json` — the case entry at pharn-ci 0.9.0
  ```

- `plugins/pharn-ci/skills/pharn-ci-cover/references/report.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-cover/references/report.md` — byte copy of the explain report reference (CI compares them)
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md` — description range 0.1.x to 0.9.x, new comment sections, new Never rules
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md` — the 24 new codes, behaviour changes, input rename
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/references/policy.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/references/policy.md` — rules P13 and P14, P01 to P14, 0.6.0 precedence
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/references/report.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/references/report.md` — new report objects, `fix`, new comment sections
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md` — description range to 0.9.x and P01 to P14, body to 0.9.1
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/references/enable.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/references/enable.md` — version lines and what 0.5.0 to 0.9.1 apply
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/references/keys.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/references/keys.md` — every v0.9.1 key path, injection, dependencies.lookup, tighten-only
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs` — header names v0.9.1 and the new digest
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/scripts/policy.v1.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/scripts/policy.v1.json` — byte copy of v0.9.1's schema/policy.v1.json
  ```

- `plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs` — accept a version range that covers 0.3.x and 0.4.x
  ```

- `plugins/pharn-ci/tests/ac-0-4-5-policy-skill.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/ac-0-4-5-policy-skill.test.mjs` — the policy schema's top-level keys gain `injection`
  ```

- `plugins/pharn-ci/tests/check-policy.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/check-policy.test.mjs` — the bundled schema digest moves to v0.9.1
  ```

- `plugins/pharn-ci/tests/pins.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/pins.test.mjs` — the policy schema's top-level keys gain `injection`
  ```

- `pharn/features/pharn-ci-explain-policy-current/AC-TESTS.lock.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/BUILD.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/REGRESSION.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/VERIFY.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/cost.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/regression-report.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-explain-policy-current/verify-report.json` — _not named in PLAN ## Files_
- `plugins/pharn-ci/evals/explain-dependency-d05/case.yaml`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/case.yaml` — the eval case
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/answer.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/answer.md` — what the answer must and must not say
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/loads-skill.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/loads-skill.md` — the explain skill is loaded
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-commit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-commit.md` — no commit
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-edit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-edit.md` — no Edit call
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-gh-writes.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-gh-writes.md` — no gh write call
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-label-command.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-label-command.md` — no accept label command
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-write.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-write.md` — no Write call
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/ran-gh.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/ran-gh.md` — the answer is grounded in the gh fixture
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-github-workflows-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-github-workflows-pharn-ci-yml.md` — generated whole-file grader
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-json.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-json.md` — generated whole-file grader
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-lock-json.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-lock-json.md` — generated whole-file grader
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-pharn-ci-yml.md` — generated whole-file grader
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/prompt.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/prompt.md` — the person's question
  ```

- `plugins/pharn-ci/evals/explain-dependency-d05/scaffold.sh`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-dependency-d05/scaffold.sh` — the repository, the gh fixture and the generated report
  ```

- `plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-d05.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-d05.json` — the gh fixture template for the case
  ```

- `plugins/pharn-ci/tests/ac-0-9-1-descriptions.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-9-1-drift.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-9-1-eval.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-9-1-explain.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-9-1-policy.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/fixtures/report.v2.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/fixtures/report.v2.json` — byte copy of v0.9.1's schema/report.v2.json for the drift test
  ```

- `plugins/pharn-ci/tests/lib/schema-drift.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/lib/schema-drift.mjs` — the drift comparison functions
  ```

- `plugins/pharn-ci/tests/schema-drift.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/schema-drift.test.mjs` — codes.md against the report schema, keys.md against the policy schema
  ```

## Verdicts

**iteration 3 (final) only.** `/pharn-loop` OVERWRITES `verify-report.json` and `regression-report.json`
in place whenever it re-runs those stages, so earlier iterations' verdicts are not on disk at the
stop and this
report will not invent them. Per-iteration **cost** is genuine and is in `## Tokens` above.

- isolation: HOST (host execution accepted by operator)

- verify: `FAIL`

  failing_gates, quoted as DATA:

  ```text
  format:check
  ```

- acceptance criteria: `PASS` (test-first)

  the AC gate — id, level, status, reason, matched test ids — quoted as DATA:

  ```text
  AC-1  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-descriptions.test.mjs::AC-1: pharn-ci-explain names 0.1.x to 0.9.x, and pharn-ci-policy names a range ending at 0.9.x and P01 to P14
  AC-2  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-explain.test.mjs::AC-2: codes.md names every code of v0.9.1's report schema, and each new code sits on a heading or table row with its level
  AC-3  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-explain.test.mjs::AC-3: codes.md states the fail-on-verdict rename and the behaviour changes of 0.5.0 to 0.8.0
  AC-4  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-explain.test.mjs::AC-4: report.md describes the new report objects and the fix object, and pharn-ci-cover carries the same file
  AC-5  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-explain.test.mjs::AC-5: SKILL.md names the four new comment sections and the dependency, injection and quarantine Never rules
  AC-6  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-eval.test.mjs::AC-6: the D05 private-registry eval has its case, prompt, generated report and an answer grader that never switches the check off
  AC-7  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-policy.test.mjs::AC-7: the bundled schema is v0.9.1's, check-policy.mjs names its digest, and keys.md names every key path
  AC-8  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-policy.test.mjs::AC-8: the checker accepts injection.* and dependencies.lookup, and names PI06 and a non-boolean lookup
  AC-9  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-policy.test.mjs::AC-9: keys.md states the .pharn/ci.yml tighten-only rules of 0.6.0 and that dependencies.lookup never overrules never
  AC-10  unit  passed  delivered  plugins/pharn-ci/tests/ac-0-9-1-drift.test.mjs::AC-10: the drift module returns exactly the missing code and key path, and [] when nothing is missing | plugins/pharn-ci/tests/ac-0-9-1-drift.test.mjs::AC-10: the drift test imports the module and reads the pinned schemas and both references
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
pharn-ci v0.9.1 (equal to main) was read from a `git archive` export: CHANGELOG 0.5.0 to 0.9.1, README, LIMITS,
both schemas, action.yml and packages/core/src/fix. The report schema has no code enum: codes are listed in the
`code` property's description, and the source literals agree with it (89 codes, 24 new since 0.4.0). The policy
schema gained only `dependencies.lookup` and `injection` after 0.4.0. D05 has no registry allow-list, no warn level
and no open feature in pharn-ci's pharn/features; `dependencies.registries` names ecosystems only.
```

### learned

```text
A byte-pinned JSON copy under a Prettier-checked path needs a `.prettierignore` entry named in the plan before the
build anchor; a widening after the anchor is refused. Prettier ignores `plugins/*/skills/*/scripts` and
`plugins/pharn-ci/evals/fixtures/inputs` already.
```

### next_steps

```text
A person adds `plugins/pharn-ci/tests/fixtures` to `.prettierignore` (one line), then runs `npm run check`, which
should pass with that change alone. The SPEC is a Draft again and needs a person's approval before a stage reuses it.
```
