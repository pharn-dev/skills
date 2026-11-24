# GRILL — collect-rules-gaps-loss

pharn/features/collect-rules-gaps-loss/PLAN.md · chain: GREEN (verified by pharn/floor/check-plan-spec-agree.mjs) · lessons: GREEN (verified by pharn/floor/check-plan-lessons.mjs)

mode: full (/pharn-grill collect-rules-gaps-loss, run by /pharn-loop) · round: 1

skills: mode=none (no-skills); read=[]

grillers: 10 registered, 10 printed (pharn/floor/griller-extract.mjs) — 139039 B of griller files, 72251 B printed; deep omission: 10 pharn-owned, 0 other; left out where present: guarantee-audit (10), machine-readable-emission (10), two-layers (10), layer-1 (10), finding-output (10); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 20 (spans), 22 (alerting), 22 (spans), 48 (logging), 63 (alerting), 64 (alerting), 79 (alerting), 79 (spans), 83 (logging), 126 (alerting), 135 (alerting), 135 (spans), 136 (logging), 194 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

<!-- GRILL-FINDINGS:BEGIN — rendered by pharn/floor/grill-findings.mjs from grill-findings.json; do not edit -->
```yaml
- id: G1-1
  type: FINDING
  rule_id: "P6"
  severity: important
  file: "pharn/features/collect-rules-gaps-loss/PLAN.md:202"
  problem: "The plan departs from a SPEC Constraint (unit tests in test/operations.test.mjs, integration tests in test/integration/runtime.test.mjs) by mapping two new test files instead; the reason is sound, but in an unattended loop no human confirms it, so the human should accept the deviation or amend the SPEC."
  evidence: "The AC test file location differs from the SPEC (flag for the grill and the human). ... So AC-TESTS.md maps two new files in the same suites"
- id: G1-2
  type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/features/collect-rules-gaps-loss/PLAN.md:41"
  problem: "The SPEC assumes a recording that is both invalid and over the cap gets a refusal naming both causes, but fileEvents stops reading at the cap (records.mjs:194-196), so an invalid line after the cap is never seen and the refusal names only the cap; the plan does not state this limit."
  evidence: "The message keeps the prefix and names each cause found (SPEC Assumptions: both when both apply)"
- id: G1-3
  type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/features/collect-rules-gaps-loss/PLAN.md:85"
  problem: "collect's samples() stops at the abort check, so when --duration-ms or SIGINT ends a run before the input is fully read, quality covers only a prefix while truncated stays false; the planned tools.md sentence says collect reports quality as summarize does (which reads the whole file) without stating this bound."
  evidence: "add that the collect result's `quality` reports gaps, stalled samples and loss as summarize does."
- id: G1-4
  type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/features/collect-rules-gaps-loss/PLAN.md:186"
  problem: "AC-5's 'same as before this change' cannot be compared with the old code in a post-change test, and the plan names no baseline values, so the test stage must pin absolute expected windows, spans, alerts, ok and results values derived independently of the new code."
  evidence: "AC-5 (integration): `collect` and `rules` give the collector, evaluator and runner the same input as before."
```
<!-- GRILL-FINDINGS:END -->

## Summary (advisory)

I checked the plan's claims against the live source this run, reading `src/phargus/runtime/operations.mjs`,
`records.mjs`, `summary.mjs`, `phargus.mjs`, `scripts/generate.mjs`, the existing tests that use `readWindows`,
`collect` and `replayRules`, and the knowledge files. These claims hold:

- `qualityTracker(status, intervalMs)` exists, and `summarizeEvents` calls `tracker.add` on every record. So feeding
  every record in `collect`'s `samples()` and in `readWindows` reuses the one tracker, and no second gap or loss rule
  is written.
- `collect` already returns `quality: status`. Both the `--file` and `--follow` inputs flow through `samples()`.
- `readWindows` currently builds a local `quality()` and drops it. The new trailing parameters keep the existing
  3-argument and 4-argument calls working, and passing `undefined` for `maxEvents` still uses the 10,000 default.
- The existing assertions `/untruncated/` (event-limits.test.mjs:110) and `/valid, untruncated input/`
  (runtime.test.mjs:284) still match the planned message.
- The CLI already parses `--interval-ms` into `options.intervalMs` and does not pass it to `collect` or `replayRules`.
- `generate.mjs` copies every `runtime/*.mjs` into each skill's `scripts/` and every catalogued reference, all run
  through prettier. The current copies are byte-identical to their sources, so the plan's 16-file list (five skills,
  plus `phargus-rules/references/rules.md`) matches what is generated.
- AC-3's arithmetic holds: the window gap rule counts `start !== previousWindowEnd` once, and the evaluator receives
  the same three windows. AC-4 holds because the `rules` tracker judges the raw samples, not the aggregated windows.

The concerns:

- **G1-1:** a SPEC Constraint is knowingly departed from. The plan gives its reasons and flags the change, but no
  human confirms it in an unattended loop.
- **G1-2:** an edge of the SPEC's "names both causes" assumption that the reader cannot reach, because reading stops
  at the cap.
- **G1-3:** a partial `collect` read is reported without saying it is partial.
- **G1-4:** AC-5's "as before" needs absolute expected values in the test.

For each griller axis, I found no other concern:

- **Architecture and coupling:** the plan fits. Passing the caller's `status` into `readWindows` and filling it in
  place follows the established `fileEvents(path, status)` / `summarizeEvents(..., status)` pattern.
- **Security and privacy:** the scanners found nothing. The refusal message prints counts, never line content, and
  sandbox execution is unchanged.
- **Performance:** the tracker does constant work per record.
- **Observability:** the change is evidence-quality reporting in a CLI helper, with no new production runtime.
- **Documentation:** the plan lists knowledge, JSDoc and CHANGELOG updates.
- **Comprehension:** the 1000 ms default and the reason the tracker skips aggregated windows are written down.
- **Error handling:** the refusal causes and the existing invalid/mixed/empty checks are kept.
- **Testability:** AC-TESTS.md maps every AC.
- **AC-8:** the plan tests with `generate.mjs --check` rather than `npm run build`. It argues that the two produce
  the same files once the copies match, and I agree.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 1 important, 3 minor) — for the human to weigh before /pharn-build. This is model judgment, not a statement that the plan is sound.
