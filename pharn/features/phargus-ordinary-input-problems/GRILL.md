# GRILL — phargus-ordinary-input-problems

Plan: `pharn/features/phargus-ordinary-input-problems/PLAN.md` · chain: GREEN (verified by
pharn/floor/check-plan-spec-agree.mjs) · lessons: GREEN (verified by pharn/floor/check-plan-lessons.mjs)

mode: full (/pharn-grill phargus-ordinary-input-problems, run by /pharn-loop, round 1)

skills: mode=none (no-skills); read=[]

grillers: 10 registered, 10 printed (pharn/floor/griller-extract.mjs) — 139039 B of griller files, 72251 B printed; deep omission: 10 pharn-owned, 0 other; left out where present: guarantee-audit (10), machine-readable-emission (10), two-layers (10), layer-1 (10), finding-output (10); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 66 (alerting), 66 (spans), 67 (logging), 68 (logging), 69 (logging), 147 (logging), 148 (logging), 150 (spans), 163 (logging), 173 (logging), 266 (logging), 270 (logging), 297 (logging), 298 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

<!-- GRILL-FINDINGS:BEGIN — rendered by pharn/floor/grill-findings.mjs from grill-findings.json; do not edit -->
```yaml
- id: G1-1
  type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/features/phargus-ordinary-input-problems/PLAN.md:33"
  problem: "The sketch strips the BOM with a regex holding a literal U+FEFF character; the repo's eslint (js.configs.recommended, no-irregular-whitespace, which checks regexes by default) rejects it (probed this run on stdin: 'Irregular whitespace not allowed'), so copying the sketch verbatim fails AC-13's npm run lint, and the character is invisible to a reader; the escape /^\\uFEFF/ lints clean."
  evidence: "pending = pending.replace(/^<literal U+FEFF>/, ''); (PLAN.md:33, and the same literal in the prose at PLAN.md:18)"
- id: G1-2
  type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/features/phargus-ordinary-input-problems/PLAN.md:284"
  problem: "The approved SPEC's Constraint says each acceptance criterion has a unit test in test/data.test.mjs, test/summary-regressions.test.mjs or test/capture.test.mjs, but the plan covers AC-11, AC-12 and AC-13 only with ac-* files that CONTRIBUTING requires to be dropped or folded before merge, so after the fold those three criteria have no permanent test; the plan defers this to the grill or a human, and only a human can accept the deviation or amend the SPEC."
  evidence: "So the plan covers AC-11 to AC-13 only with the `ac-*` files and the existing `check:generated`. The grill or a human should confirm this reading."
- id: G1-3
  type: FINDING
  rule_id: "P7"
  severity: important
  file: "pharn/features/phargus-ordinary-input-problems/PLAN.md:290"
  problem: "The plan says the ac-* files must not reach CI but names no step or owner that folds or removes the six .github/scripts/ac-phargus-input-*.test.mjs files before the branch is pushed; the root CI job (Node 22.18.0) runs root npm test over .github/scripts/*.test.mjs after a root-only npm ci, so the docs and checks tests that spawn npm scripts in src/phargus would fail there."
  evidence: "Both are present in this worktree, but not in the root CI job, so the `ac-*` files must not reach CI."
- id: G1-4
  type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/features/phargus-ordinary-input-problems/PLAN.md:79"
  problem: "The zero-event cleanup unlinks both files inside capture's finally block, and the plan does not say what happens if a close or unlink rejects (for example a file already removed from --out): that rejection would replace the captured failure, so the printed error would lose the HTTP 401 / ECONNREFUSED cause the SPEC wants named; rm with force: true, or not letting a cleanup error replace failure, keeps the cause."
  evidence: "If `failure` is set and `manifest.events === 0`, it closes both handles and unlinks `eventsPath` and `manifestPath`, the two files this call reserved with `wx`."
```
<!-- GRILL-FINDINGS:END -->

## Summary (advisory — model judgment, gates nothing)

The plan fits the existing code. Each of the five problems is fixed in the one existing function it enters through,
with no new module and no sibling coupling. The architecture, coupling, performance, privacy and security grillers
raised nothing. The reader stays bounded at about 1 MiB plus one chunk, and the bearer token never enters the printed
cause. The grill checked these claims against the live repo this run:

- The plan's line-reader sketch, with the BOM written as an escape, was run over chunk sizes of 1 B, 2 B, 64 KiB and
  4 MiB. It yields `["a","b"]` for a BOM file, one `null` for a long line in the middle, at the end of input, twice in
  a row, and before a blank line. That is the behaviour AC-1 to AC-3 need. As written, though, the sketch fails lint
  (G1-1).
- Node's `fetch` error causes match the SPEC's assumption on both CI Node versions. On 22.18.0 and 24.13.1, a closed
  port gives `cause.code` `ECONNREFUSED`, a refused redirect gives `cause.message` `unexpected redirect`, and a
  `localhost` closed port (an AggregateError with an empty message) still carries `code` `ECONNREFUSED`.
- `src/phargus` `npm test` reports `tests 58` today, so the plan's baseline is right.
- `classifyLine` and `lines` have exactly three callers: `fileEvents`, `following` and `sseEvents`. The
  `classifyLine(null)` branch covers the first two, so leaving `runtime/operations.mjs` untouched holds. The existing
  integration tests on `--allow-logs` (a `{level, message}` log, a corrupt sample with a numeric `timestamp`, and
  truncated sample JSON) keep their results under the new field rule.

The concerns are about process and tooling, not the runtime approach. G1-2 is a real conflict between the approved
SPEC's Constraint and CONTRIBUTING's ban on `ac-*` files plus the rule against tests on English wording. The plan names
it but cannot settle it, so a human should either accept the deviation or amend the SPEC. G1-3 is the operational side
of the same rule: nothing in the plan removes the `ac-*` files before a push. G1-4 is an edge case where a cleanup error
could hide the cause the increment exists to surface.

A residual limit, recorded in prose and not raised as a finding: under `--allow-logs`, the field rule still counts a
JSON application log as a corrupt record when it carries a numeric `timestamp` (epoch-millisecond loggers) or a numeric
`start`. The SPEC chose this (AC-5 `{"timestamp":10}`), and the planned `tools.md` text states the rule, so the limit
is labeled.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory: 3 important, 1 minor), for the human to weigh
before /pharn-build. This verdict makes no claim that the plan is sound. The two floor results in the header are this
run's only guarantees.
