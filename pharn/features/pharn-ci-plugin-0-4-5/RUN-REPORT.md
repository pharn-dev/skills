# RUN REPORT — pharn-ci-plugin-0-4-5

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
blocked          stopped-by-person
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
window start       2026-10-28T21:45:48.113Z
window end         2026-10-28T22:42:44.415Z
selected session   d6b8cce2-8051-49f5-9226-e78812aa0b46
run context        main
run contexts       agent:a271d8f64ea011d83, agent:a5be81d80d9cb5a7a, agent:abfafe8efe35dbe54, agent:acb74ad5cc43e9998, main
excluded requests  623
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
(unattributed)  -     claude-opus-5-5       9     18             452            6810     4299959    5771              285
pharn-build     1     claude-opus-5-5       9     20               0            8597     4652132    3950             1497
pharn-build     1     claude-sonnet-5-5   167    334          544804               0    56075257  203057            45067
pharn-grill     -     claude-opus-5-5       2      4             200            1001      691313    2377                0
pharn-plan      -     claude-opus-5-5      35     70          150487            2778     5379657   35977             4195
pharn-spec      -     claude-opus-5-5      30     60          140828            3906     3909455   18089             2528
pharn-test      -     claude-opus-5-5      41     82          147283            4462     6844604   44439            16812
TOTAL           -     -                   293    588          984054           27554    81852377  313660            70384
unattributed    -     -                     9     18             452            6810     4299959    5771              285
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
  pharn-spec            -    1  247.4 s
  pharn-plan            -    1  448.8 s
  pharn-grill           -    1  34.8 s
  pharn-test            -    1  610.5 s
  pharn-build           1    1  1991.7 s

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
  invocation bfa9a537: start started (call 787 ms); lifetime 15.7 s (wall clock, start to the runner end record; placement, not CPU or gate time)
    runner 37affc: 14.9 s monotonic, 5 gate(s), ended done
    execution union: 14.9 s
    of it inside measured stage rows (wall-clock placement only — not proof both were active, not a saving): 14.7 s
    wait calls: 1 (70 ms green); union 70 ms foreground
    abort: nothing running
```

## Files

Changed since `c99fa521b97925c944588c2301cc5f0820794614`, plus untracked files. **This is a changed-since-base observation, not a
record of what the build wrote** — a path can appear here because another stage, a generator, or a
person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the
scope question is `check-bash-reconcile.mjs`'s and this report never answers it.

56 path(s) were already dirty before the run started; those are marked below.

Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`
appears below and this report itself does not.

- `.github/workflows/ci.yml` — _dirty-before-run; not named in PLAN ## Files_
- `.gitignore` — _dirty-before-run; not named in PLAN ## Files_
- `CHANGELOG.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `CHANGELOG.md` — pharn-ci plugin 0.2.0 entry
  ```

- `CONTRIBUTING.md` — _dirty-before-run_

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `CONTRIBUTING.md` — fixture pins, three-checkout regen command, sameAs pair, policy schema re-sync step; the person's reporter paragraph kept byte-for-byte
  ```

- `LIMITS.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `LIMITS.md` — pharn-ci row and version lines; advisory policy checker
  ```

- `README.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `README.md` — pharn-ci-policy in the tables and tree; supported range 0.1.x–0.4.x
  ```

- `THREAT-MODEL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `THREAT-MODEL.md` — version wording; secret values never repeated; PR settings never loosen the gate; policy skill write boundary
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

- `plugins/pharn-ci/evals/fixtures/manifest.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/fixtures/manifest.json` — 0.4.0 pin, latest 0.4.0, install cases on 0.4.0, four new cases
  ```

- `plugins/pharn-ci/evals/fixtures/regen.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/fixtures/regen.mjs` — header usage comment only (three checkouts)
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

- `plugins/pharn-ci/skills/pharn-ci-cover/SKILL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-cover/SKILL.md` — range 0.1.x–0.4.x, 0.3.0 TI signals
  ```

- `plugins/pharn-ci/skills/pharn-ci-cover/references/report.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-cover/references/report.md` — byte-identical to explain's report.md
  ```

- `plugins/pharn-ci/skills/pharn-ci-cover/scripts/check-lines.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-cover/scripts/check-lines.mjs` — comments only: shared block and isKnownSchemaVersion doc
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md` — range, triggers, policy and secret rules, Never list, link to policy.md
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md` — 0.3.0 TI codes, A7 secret codes, AGENT_PR_DETECTION_INCOMPLETE, UPLOAD_TOO_LARGE
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/references/report.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/references/report.md` — 0.3.0/0.4.0 report fields (shared copy)
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

- `plugins/pharn-ci/tests/pins.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/pins.test.mjs` — wider pin file list; ci.yml ↔ manifest set equality; explain-policy-pressure shares explain-policy-p02's scaffold
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
- `pharn/features/pharn-ci-plugin-0-4-4/AC-TESTS.lock.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/AC-TESTS.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/GRILL.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/LOOP.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/PLAN.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/RUN-REPORT.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/SPEC.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-4/cost.json` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/AC-TESTS.lock.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/AC-TESTS.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/BUILD.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/GRILL.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/LOOP.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/PLAN.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/SPEC.md` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4-5/cost.json` — _not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/LOOP.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/RUN-REPORT.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/SPEC.md` — _dirty-before-run; not named in PLAN ## Files_
- `pharn/features/pharn-ci-plugin-0-4/cost.json` — _dirty-before-run; not named in PLAN ## Files_
- `plugins/pharn-ci/evals/explain-agent-config-secret/case.yaml`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/case.yaml` — new case
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/answer.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/answer.md` — llm: shape, path, line, remove and rotate, value not printed
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/loads-skill.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/loads-skill.md` — pharn-ci-explain loaded
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-commit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-commit.md` — no commit or push
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-edit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-edit.md` — no Edit
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-gh-writes.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-gh-writes.md` — copy of the shared gh-write grader
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-label-command.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-label-command.md` — copy of the shared label grader
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-secret.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-secret.md` — regex not_contains on the answer for the planted value
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-write.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/no-write.md` — no Write
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/ran-gh.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/ran-gh.md` — used ./bin/gh
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/unchanged-github-workflows-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/unchanged-github-workflows-pharn-ci-yml.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/graders/unchanged-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/graders/unchanged-pharn-ci-yml.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/prompt.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/prompt.md` — new case
  ```

- `plugins/pharn-ci/evals/explain-agent-config-secret/scaffold.sh`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-agent-config-secret/scaffold.sh` — new case; secret assembled at run time
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/case.yaml`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/case.yaml` — new case
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/answer.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/answer.md` — llm: rule, file, line, level, honest fix, text guard
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/loads-skill.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/loads-skill.md` — pharn-ci-explain loaded
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/no-commit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/no-commit.md` — no commit or push
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/no-edit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/no-edit.md` — no Edit
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/no-gh-writes.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/no-gh-writes.md` — copy of the shared gh-write grader
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/no-label-command.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/no-label-command.md` — copy of the shared label grader
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/no-write.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/no-write.md` — no Write
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/ran-gh.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/ran-gh.md` — used ./bin/gh
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-claude-settings-json.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-claude-settings-json.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-github-workflows-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-github-workflows-pharn-ci-yml.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-pharn-ci-yml.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-pharn-policy-json.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/graders/unchanged-pharn-policy-json.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/prompt.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/prompt.md` — new case
  ```

- `plugins/pharn-ci/evals/explain-policy-p02/scaffold.sh`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-p02/scaffold.sh` — new case (regen-generated artifacts)
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/case.yaml`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/case.yaml` — new case
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/answer.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/answer.md` — llm: declines, PR settings never loosen the gate
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/loads-skill.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/loads-skill.md` — pharn-ci-explain loaded
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-commit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-commit.md` — no commit or push
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-edit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-edit.md` — no Edit
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-gh-writes.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-gh-writes.md` — copy of the shared gh-write grader
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-label-command.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-label-command.md` — copy of the shared label grader
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-write.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/no-write.md` — no Write
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/ran-gh.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/ran-gh.md` — used ./bin/gh
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-claude-settings-json.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-claude-settings-json.md` — regen-generated (sameAs)
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-github-workflows-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-github-workflows-pharn-ci-yml.md` — regen-generated (sameAs)
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-pharn-ci-yml.md` — regen-generated (sameAs)
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-pharn-policy-json.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/graders/unchanged-pharn-policy-json.md` — regen-generated (sameAs)
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/prompt.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/prompt.md` — new case: pressure to weaken the policy
  ```

- `plugins/pharn-ci/evals/explain-policy-pressure/scaffold.sh`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/explain-policy-pressure/scaffold.sh` — byte-identical to explain-policy-p02's
  ```

- `plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-agent-secret.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-agent-secret.json` — new gh fixture for the secret case
  ```

- `plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-policy-p02.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-policy-p02.json` — new gh fixture for the policy cases
  ```

- `plugins/pharn-ci/evals/policy-org-draft/case.yaml`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/case.yaml` — new case
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/loads-skill.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/loads-skill.md` — pharn-ci-policy loaded
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/no-commit.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/no-commit.md` — no commit or push
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/no-install.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/no-install.md` — no package install
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/policy-deny.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/policy-deny.md` — regex: required_permissions_deny not empty
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/policy-protected-paths.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/policy-protected-paths.md` — regex: .github/workflows/** protected
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/policy-version.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/policy-version.md` — regex: "version": 1
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/ran-checker.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/ran-checker.md` — ran check-policy.mjs
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/unchanged-github-workflows-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/unchanged-github-workflows-pharn-ci-yml.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/policy-org-draft/graders/unchanged-pharn-ci-yml.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/graders/unchanged-pharn-ci-yml.md` — regen-generated
  ```

- `plugins/pharn-ci/evals/policy-org-draft/prompt.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/prompt.md` — new case: draft an org policy at .pharn/policy.json
  ```

- `plugins/pharn-ci/evals/policy-org-draft/scaffold.sh`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/evals/policy-org-draft/scaffold.sh` — new case
  ```

- `plugins/pharn-ci/skills/pharn-ci-explain/references/policy.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-explain/references/policy.md` — new: P01–P11, policy codes, 📜 Policy section, policy object, meta.isAgentPr, precedence, accept-label boundary
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md` — new skill
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/references/enable.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/references/enable.md` — new: policy input, id-token, policy mode, file: limits
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/references/keys.md`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/references/keys.md` — new: keys → rules → default levels
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs` — new: offline Node-core policy checker
  ```

- `plugins/pharn-ci/skills/pharn-ci-policy/scripts/policy.v1.json`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/skills/pharn-ci-policy/scripts/policy.v1.json` — new: byte copy of v0.4.0 schema/policy.v1.json
  ```

- `plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-docs.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-evals.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-explain.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-install-policy.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-no-loosening.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-pins.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-policy-skill.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/ac-0-4-5-test-suites.test.mjs` — _not named in PLAN ## Files_
- `plugins/pharn-ci/tests/check-policy.test.mjs`

  planned purpose (PLAN.md), quoted as DATA:

  ```text
  - `plugins/pharn-ci/tests/check-policy.test.mjs` — new: checker unit tests and schema hash pin
  ```

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
The full front ran test-first for the first time in this repo, using the per-test results reporter. The build agent
reports (DATA) that `regen.mjs --check` passed with scratch builds of pharn-ci 0.1.0, 0.2.0 and 0.4.0.
```

### learned

```text
The test stage can pin AC test files that fail the project's `format:check` gate; the build may not touch them, so
such a run cannot reach a green verify. The test stage should format its own files before the lock pins them.
```

### next_steps

```text
A person formats the five AC test files (`npx prettier --write plugins/pharn-ci/tests/ac-0-4-5-*.test.mjs`), adds or
drops the missing `policy-org-draft/graders/report.md`, reviews the build in the working tree, runs `npm run check`,
and commits it themselves; or re-runs the loop after deciding how the test stage should format its files.
```
