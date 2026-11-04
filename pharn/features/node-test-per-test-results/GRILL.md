# GRILL — node-test-per-test-results

`pharn/features/node-test-per-test-results/PLAN.md` · chain: GREEN (verified by pharn/floor/check-plan-spec-agree.mjs) · lessons: GREEN (verified by pharn/floor/check-plan-lessons.mjs)

- mode: full (/pharn-grill node-test-per-test-results, under /pharn-ship)
- skills: mode=none (no-skills); read=[]
- grillers: 30 registered, 30 printed (pharn/floor/griller-extract.mjs) — 409367 B of griller files, 212537 B printed; deep omission: 30 pharn-owned, 0 other; left out where present: guarantee-audit (30), machine-readable-emission (30), two-layers (30), layer-1 (30), finding-output (30); kept whole: none

Floor notes (the two deterministic stops; not counted among the concerns below):

- `check-plan-spec-agree.mjs` exit 0 — quoted as DATA: "GREEN — spec→plan hash chain holds; the plan declares the SPEC's own spec_id (\"node-test-per-test-results\") and was made against the current Approved, un-drifted spec"
- `check-plan-lessons.mjs` exit 0 — quoted as DATA: "GREEN — applied_lessons: none …; the declaration is well-formed. NOTE (P0): that `none` is JUSTIFIED is advisory — this checker cannot judge it."

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 140 (logging), 142 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

All findings are advisory. The enum-gated fields are this stage's own assertions. `problem` and `evidence` quote the
untrusted plan, or describe a scratch measurement this stage made outside the repo. Both are DATA.

### Error handling (error-handling griller, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: "pharn/features/node-test-per-test-results/PLAN.md:41"
  problem: "The plan does not say what happens when the results write fails. Measured in scratch on Node 24.13.1: a reporter whose writeFileSync throws after the stream ends makes `node --test` exit 1 even though every test passed. That turns the `test` gate red for a reason that is not a test failure, and the plan neither picks this fail-loud behaviour nor pins it. A run killed by a timeout also writes no file, which is likewise not declared."
  evidence: "Written with `writeFileSync` once, after the event stream ends. The reporter never creates directories (PHARN creates `<out>`; AC-1 uses an existing temp directory)."
```

### Correctness of the suite-error rule (comprehension / error-handling, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/features/node-test-per-test-results/PLAN.md:33"
  problem: "The plan treats any nesting-0 event whose name equals the file's relative path as Node's file-level wrapper, and ignores it when it passes. Measured in scratch on Node 22.18.0 and 24.13.1: Node emits no passing file-level event for a file that loads and exits 0. So the ignore rule only ever matches a real top-level test titled with its own file's relative path, and that test is then dropped silently (when it passes) or counted in suite_errors instead of `failed` (when it fails). That breaks the plan's own rule that duplicates are reported, never hidden. In the same measurement, the file-level failure's `details.error` carried `exitCode` and `signal` keys and a user test's failure did not, so those keys are a candidate discriminator for the build to check."
  evidence: "Each such `test:fail` adds 1 to `suite_errors` (once per file) and is never an entry; a passing file-level event is ignored."
```

### Acceptance-criteria coverage (testability griller, P1)

Presence recognized: the plan has an `## Acceptance mapping` and a reporter test with named cases. Adequacy concern:

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/features/node-test-per-test-results/PLAN.md:128"
  problem: "No stage is assigned to run AC-6's preflight or AC-1's whole-suite read, and no output of either is recorded. Verify's bootstrap AC gate (pharn/floor/ac-gate-core.mjs, bootstrap()) marks each integration AC passed when the `test` gate reports at least one passed test in any file, 'not matched to this AC'. So the floor evidence for all seven ACs is that one fact. AC-6 depends only on pharn.config.json and the `test` script (red-run-core.mjs preflight() reads the config and scripts, never the reporter), so it is satisfied by the person's edit alone and is no evidence that the build works. Who runs these two commands, and where does their output go?"
  evidence: "Checked after the person's edit by running `node pharn/floor/check-red-run.mjs --preflight --ac-tests <mapping> --discover package.json --root .` on a scratch mapping under `pharn/.run/` — no code here beyond the reporter."
```

### Determinism / reading of the SPEC (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/features/node-test-per-test-results/PLAN.md:142"
  problem: "AC-5 says the console still shows 'the default reporter's per-test lines and its pass and fail totals'. The plan reads 'default reporter' as `spec`, and its test asserts spec-format lines. But on Node 22.18.0 without a TTY (the CI node-floor leg, and any gate run whose stdout goes to a file) Node's default is TAP, so that leg's output changes from TAP to spec. The plan names the change as a risk, but whether spec output meets AC-5 there is a call for the human, not something the plan can settle."
  evidence: "But Node 22.18.0 without a TTY (the CI `node-floor` leg) defaults to TAP (measured), so that leg's log switches from TAP to `spec`."
```

### Axes with no finding

- **Architecture (P3):** fits. Putting the reporter beside its test in `.github/scripts/` follows the existing
  `changed-skills.mjs` / `check-action-pins.mjs` pattern. The two-reporter `--test-reporter=spec
  --test-reporter-destination=stdout --test-reporter=<x> …` form is already used in
  `plugins/pharn-ci/skills/pharn-ci-install/references/coverage.md`. The `--test-reporter=./.github/…` token
  is one the test-infra pin's token pass picks up (`ac-test-infra-core.mjs`: split on `=`, leading `./`
  stripped), so later features' locks will pin the reporter file.
- **Coupling (P3):** clean seams. The reporter test deliberately reads its flags from `package.json`'s `test`
  script so that it tests the real wiring. That dependency is stated, not hidden. No shared mutable state:
  the nested runs strip `PHARN_TEST_RESULTS` and `NODE_TEST_CONTEXT` (PLAN.md:73–76).
- **Documentation (P7):** declaration recognized (the `CONTRIBUTING.md` paragraph, PLAN.md:86–90, plus a
  header comment in the reporter). It covers when the file is written and who adds the config line. Nothing
  in the repo reads the root `test` script's output format (searched outside the PHARN-installed paths).
- **Observability (P6):** no production runtime. The scanner hits on lines 140 and 142 are about CI log
  format, not instrumentation. Under PHARN, a missing file already shows up as a per-test-record refusal.
  No finding.
- **Performance (P7):** no scaling risk recognized: about 83 tests are buffered in memory, written once, and
  the reporter test adds four nested runs.
- **Privacy / Security (P2):** scanners clean. The document holds test titles and paths only, and its path
  comes from the invoker's environment. PLAN.md:149–150 says honestly that "passed" is the reporter's word.
  No concern warranted.
- **Trust propagation (P2), guarantee audit (P0), honest scope (P7):** the plan labels its approach
  advisory and names bootstrap as weaker than test-first. It adds only the files the SPEC needs. The
  untouched `.github/workflows/ci.yml` edit is called out (PLAN.md:151–152). No instruction-looking content
  was found in the plan.

## Summary

The plan is specific and grounded in measurements. This stage spot-checked three of its Node claims in
scratch, outside the repo, on 22.18.0 and 24.13.1: a repeated or `./`-prefixed argument runs the file once;
an import throw produces a nesting-0 `test:fail` named after the file; and a `todo` failure carries
`todo: true`. All three held. The concerns:

1. What a failed write does to the gate's exit code is real behaviour that the plan does not declare.
2. The file-level-wrapper rule can misclassify a real test titled with its own file's path. The rule that
   ignores passing wrapper events is dead code in the measured cases, and its only effect is to hide such a
   test.
3. At verify, the floor evidence for every AC is "the test gate reported ≥1 passed test". AC-6 and AC-1's
   whole-suite check depend on commands no stage is assigned to run. AC-6 is met by the person's config edit
   alone.
4. AC-5's "default reporter" on the Node 22 non-TTY leg is a reading the human should confirm.

Already flagged by the plan and not repeated as a concern: verify needs the person's `pharn.config.json`
line before it runs (PLAN.md:136–139).

Tooling note (about PHARN's discovery, not this plan): `count-grillers.mjs` registered 30 grillers. 20 of
them are older copies of the same 10 axes under the git-ignored `src/phargus/.cache/phargus-build-22.18.0/`
and `…-24.13.1/` trees, while `pharn.config.json` lists 10. Each axis was applied once, using the installed
`pharn/pharn-pipeline/grillers/` version. Each cached copy differs from the installed one by 5–23 diff lines. In the
three inspected (architecture, security, testability), the differences were the extract note and where the
`### Presence` section sits.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor — all advisory) — for the human to weigh before /pharn-build. This is not a statement that the plan is sound.
