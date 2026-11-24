# GRILL — phargus-summary-bounded-memory

Plan: `pharn/features/phargus-summary-bounded-memory/PLAN.md` · chain: GREEN (verified by pharn/floor/check-plan-spec-agree.mjs) · lessons: GREEN (verified by pharn/floor/check-plan-lessons.mjs)

mode: full (/pharn-grill phargus-summary-bounded-memory, invoked by /pharn-loop)

skills: mode=none (no-skills); read=[]

grillers: 10 registered, 10 printed (pharn/floor/griller-extract.mjs) — 139039 B of griller files, 72251 B printed; deep omission: 10 pharn-owned, 0 other; left out where present: guarantee-audit (10), machine-readable-emission (10), two-layers (10), layer-1 (10), finding-output (10); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 11 (spans), 14 (spans), 22 (spans), 24 (spans), 25 (spans), 29 (spans), 30 (spans), 36 (metrics), 36 (spans), 44 (spans), 46 (spans), 59 (spans), 67 (spans), 69 (spans), 71 (spans), 89 (spans), 90 (spans), 105 (spans), 130 (spans), 179 (spans), 180 (spans), 184 (metrics), 184 (spans), 185 (spans), 186 (spans), 194 (spans), 196 (spans), 213 (metrics), 219 (metrics), 219 (spans). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

<!-- GRILL-FINDINGS:BEGIN — rendered by pharn/floor/grill-findings.mjs from grill-findings.json; do not edit -->
```yaml
- id: G1-1
  type: FINDING
  rule_id: "P6"
  severity: important
  file: "pharn/features/phargus-summary-bounded-memory/PLAN.md:206"
  problem: "The SPEC Scope names src/phargus/test/summary-routes.test.mjs as the home of the unit tests, and the plan settles that mismatch itself by moving AC-1 to AC-5 into a new sibling file (AC-TESTS.md: summary-route-cap.test.mjs); the reasoning is sound, but a SPEC/PLAN divergence is the human's call, so confirm it or amend the SPEC."
  evidence: "The SPEC Scope puts the unit tests in `src/phargus/test/summary-routes.test.mjs`, which already exists. ... So AC-1 to AC-5 go to a new sibling file in `src/phargus/test/`"
- id: G1-2
  type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/features/phargus-summary-bounded-memory/PLAN.md:47"
  problem: "The claim that the flag and the (other) row always agree is overstated: a recording that literally contains method (other) and path (other) (SPEC Assumptions, no special handling) produces an (other) row with routesFolded false, and since recordings are untrusted input, the knowledge text should say routesFolded, not the row's name, is what marks a partial table."
  evidence: "It is `true` exactly when at least one in-period span was counted in `(other)`, so the flag and the `(other)` row always agree (SPEC Assumptions)."
- id: G1-3
  type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/features/phargus-summary-bounded-memory/PLAN.md:191"
  problem: "AC-5 covers every existing fixture in src/phargus/test/, but the mapping (AC-TESTS.md) replays only summary-routes, summary-regressions and event-limits, while data.test.mjs, capture.test.mjs, sampling-interval.test.mjs and integration/runtime.test.mjs also summarize or compare; for those files, nothing asserts routesFolded: false."
  evidence: "AC-5 -> the existing fixtures have at most 25 pairs, far below the cap, so their counts, routes, `distinctRoutes` and percentiles are unchanged, and `routesFolded: false` is added to every summary."
- id: G1-4
  type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/features/phargus-summary-bounded-memory/PLAN.md:222"
  problem: "The AC-6/AC-7 risk note does not mention that CI's node-24 leg runs these files through npm run test:coverage from the repository root, so the 64 MB CLI child inherits NODE_V8_COVERAGE; a prototype of the planned storage, run this time on 200,000 unique-path spans, finished with about 43 MB of heap in use without coverage and 53 MB with it (one sample at the end, not a peak), so there is headroom under 64 MB but not much."
  evidence: "The CLI child runs with `--max-old-space-size=64`. Paths resolve from `import.meta.url`, because the root `test` gate runs from the repository root."
- id: G1-5
  type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/features/phargus-summary-bounded-memory/PLAN.md:103"
  problem: "The plan adds TRACKED_ROUTE_LIMIT (10,000, a memory bound) next to the existing ROUTE_LIMIT (20, the output top-N) but does not ask for a code comment saying why 10,000 and how the two limits differ, so a later reader can easily mix up the two near-identical names."
  evidence: "add the constants `TRACKED_ROUTE_LIMIT = 10_000` and `OTHER_ROUTE = '(other)'`, and the factory `routeIndex()` (Approach 1)"
```
<!-- GRILL-FINDINGS:END -->

## Summary (advisory)

The plan matches the live code. I read `src/phargus/runtime/summary.mjs` this run: span objects sit at lines 75-76 and
153-160, and per-route groups at lines 34-62. The `records.mjs` comment is at lines 175-177, and `types.d.ts:107` holds
`distinctRoutes`. The catalog gives 5 skills, each with `data` and `tools` references, which makes the 25 generated
copies the plan lists. No existing test deep-compares a whole `requests` object or summary. `compareSummaries` reads
only `metrics`, `period`, `coverage` and `conditions`, so `compare` needs no change of its own.

What was measured this run (in the session scratchpad, outside the repo):

- **The AC-6 premise holds.** Today's `summarize --file` on 200,000 unique-path spans at `--max-old-space-size=64`
  crashes with exit 134.
- **The planned design should pass AC-6.** A prototype of its storage completed on the same input: four number arrays,
  a capped route `Map` and per-group durations, read through the real `fileEvents`.

Concerns for the human:

- **G1-1 (important).** The SPEC names the test file, and the plan quietly overrides it. The plan's reason holds
  (`/pharn-regress` would drop an existing mapped file from the regression comparison), but the change should be
  confirmed, or the SPEC amended.
- **G1-2.** "Always agree" is not true for a recording that literally holds an `(other)`/`(other)` pair. The knowledge
  text should say that `routesFolded` decides whether the table is partial.
- **G1-3.** AC-5's tests replay three of the seven test files that summarize.
- **G1-4.** The 64 MB tests have thin headroom under the CI coverage leg.
- **G1-5.** The constant needs a comment saying why 10,000 and how it differs from `ROUTE_LIMIT`.

Axes with nothing to report:

- **Architecture and coupling.** All the code changes stay in one file, with a local factory and no sibling reference.
- **Error handling.** No new failure path: parsing and the `--max-events` path are unchanged.
- **Documentation.** The new field is documented in the knowledge files, `types.d.ts` and the CHANGELOG.
- **Observability.** This is a CLI tool; the `routesFolded` flag itself is the signal.
- **Security, privacy and i18n.** The scanners found nothing, and no other concern came up.
- **Migrations.** Nothing to migrate: `schemaVersion` stays 1 and the change only adds a field.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 1 important, 4 minor) — for the human to weigh before /pharn-build
