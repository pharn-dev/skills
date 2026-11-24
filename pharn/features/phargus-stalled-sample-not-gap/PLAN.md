---
spec_id: phargus-stalled-sample-not-gap
spec_content_hash: 192f319bce36ed34bed988afe17cf0a7917f9651822dd768c4df6f45e524a0d8
applied_lessons: none
---

## Approach

ADVISORY (model work). The plan follows the approved SPEC (CORE-236, S4.3) and adds nothing to it.

The rule moves into the one place every raw-sample consumer already shares: `qualityTracker(status, intervalMs)` in
`src/phargus/runtime/records.mjs`. Both `summarizeEvents` (summary.mjs) and `capture` (capture.mjs) call it, so
capture manifests and summaries pick up the new counters without any change to capture.mjs. The S4.4 follow-up can
feed collect and rules through the same function unchanged.

Today the raw-sample branch reads
`timestamp <= previousSample || timestamp - previousSample > intervalMs * 1.5` → `gaps += 1`. The new branch, for a
sample that has a predecessor:

1. `timestamp <= previousSample` → `gaps += 1` (unchanged).
2. Otherwise `lateness = timestamp - previousSample - intervalMs`.
   - `lateness <= intervalMs * 0.5` → normal: no counter changes. This is the same threshold as today's
     `> intervalMs * 1.5`.
   - `lateness > record.data.eventLoop.max / 1e6 + intervalMs * 0.5` → `gaps += 1`.
   - Otherwise it is a stalled sample: `stalledSamples += 1`, and `stalledMs += lateness`, clamped to
     `Number.MAX_SAFE_INTEGER` the same way the loss deltas are clamped.

`eventLoop.max` is in nanoseconds, so it is divided by `1e6` to compare with millisecond lateness (SPEC
Constraints). The boundary is inclusive: with max 800 ms at interval 1000, lateness 1300 is a stalled sample and 1301
is a gap (AC-1). The window branch, the dropped-counter or loss branch, and `previousSample = timestamp` stay as they
are.

`quality()` gains `stalledSamples: 0` and `stalledMs: 0`. The `Quality` type in `types.d.ts` gains both as `number`.

Both sample-coverage checks in `summary.mjs` read one new module-private helper,
`sampleCoverageMs(summary) = summary.coverage.sampleCount * summary.coverage.samplingIntervalMs + summary.quality.stalledMs`.
It applies only when `coverage.format === 'samples'`, where `samplingIntervalMs` is non-null:

- `coverageProblems`: the "recorded sample coverage differs from declared durationMs" check compares
  `sampleCoverageMs(summary)` with `durationMs`. Before, it compared the bare `sampleCount * samplingIntervalMs`.
- `compareSummaries`: the "different recorded sample coverage" check compares `sampleCoverageMs(before)` with
  `sampleCoverageMs(after)`. Before, it compared the bare `sampleCount`. `COVERAGE_TOLERANCE` (5%) is unchanged
  (SPEC Assumptions). When both sides share an interval and nothing stalled, the relative tolerance makes this the
  same verdict as today's count comparison.

`evidenceProblems` needs no change: a stalled sample never increments `gaps`, so it never adds "measurement gaps",
and no new reason or verdict is introduced (SPEC non-goal). The median `observedIntervalMs` check stays as it is
(SPEC Assumptions).

`summarizeFile` keeps recomputing raw-sample quality from the records. It merges only `invalidRecords`,
`ignoredLogs` and `truncated` from a manifest, so a manifest written before this change, without the new fields,
needs no migration (SPEC Assumptions). The compare CLI (`runtime/phargus.mjs`) always builds both summaries through
`summarizeFile`, so `quality.stalledMs` is always present when `compareSummaries` reads it.

Knowledge text, in `src/phargus/knowledge/`:

- `data.md`: replace "A schedule gap can also result from a blocked loop; it is not proof of dropped records." with
  the new rule. A late raw sample whose lateness (spacing minus the interval) is more than half an interval, but at
  most its own `eventLoop.max` (in ms) plus half an interval, is a stalled sample, counted in
  `quality.stalledSamples` with its lateness added to `quality.stalledMs`. A repeated or backwards timestamp, or a
  late sample its stall does not explain, is a gap, and a gap is still not proof of dropped records. Also state that
  sample coverage counts `stalledMs` as covered time. Window records keep the contiguity rule.
- `verification.md`: next to "…gaps or truncation result in an inconclusive comparison", state that a late sample
  explained by its own stall (`quality.stalledSamples`) does not make the comparison inconclusive. In the coverage
  paragraph, say that sample coverage is raw sample count times the sampling interval plus `quality.stalledMs`, both
  against the declared duration and against the other recording.

The generated plugin copies (`plugins/phargus/skills/*/scripts/{records.mjs,summary.mjs,types.d.ts}`,
`plugins/phargus/skills/*/references/data.md` and `plugins/phargus/skills/phargus-verify/references/verification.md`)
must equal the generator's output, which is the source run through prettier with
`src/phargus/.prettierrc.json`. `npm run build` (`scripts/generate.mjs`) rewrites every generated file in the plugin,
including plugin.json, LICENSE, `agents/openai.yaml` and the unchanged runtime modules. That is far more than this
plan's `## Files`. So the build writes each listed copy with the Write tool, with the exact bytes of its
prettier-formatted source (the sources pass `format:check`, so prettier leaves them unchanged), and then runs
`npm run check:generated` to prove they match. Once they match, AC-3's `npm run build` rewrites identical bytes.

## Applied lessons

- none: `check-lessons-index.mjs --verdict` returned `NO_CANON`. This project has no promoted memory-bank lessons
  yet, so there were none to apply.

## Steps

- `src/phargus/runtime/records.mjs`: add `stalledSamples: 0, stalledMs: 0` to `quality()`. Replace the raw-sample
  gap condition in `qualityTracker().add` with the three-way rule above (backwards or repeated → gap; lateness ≤ 0.5 ×
  interval → normal; lateness > max/1e6 + 0.5 × interval → gap; else stalled). Update the JSDoc above
  `qualityTracker` in one sentence: a late sample explained by its own `eventLoop.max` is stalled, not a gap. Leave
  the window branch and the loss logic byte-identical.
- `src/phargus/runtime/types.d.ts`: add `stalledSamples: number;` and `stalledMs: number;` to `Quality`, after
  `gaps`.
- `src/phargus/runtime/summary.mjs`: add the module-private `sampleCoverageMs(summary)` helper next to
  `matchesCoverage`, and use it in the declared-duration sample-coverage check in `coverageProblems` and in the
  before-versus-after sample-coverage check in `compareSummaries`. Adjust the `COVERAGE_TOLERANCE` comment only if it
  stops being accurate. Change no reason string.
- `src/phargus/knowledge/data.md` and `src/phargus/knowledge/verification.md`: make the text changes described in
  Approach. Remove the sentence "A schedule gap can also result from a blocked loop" entirely. Name both
  `stalledSamples` and `stalledMs` in data.md. Keep the existing line width and style, and pass prettier.
- The generated copies: for each of the five skills (phargus-diagnose, phargus-memory, phargus-rules, phargus-setup,
  phargus-verify), write `scripts/records.mjs`, `scripts/summary.mjs`, `scripts/types.d.ts` and
  `references/data.md` with the new source bytes. Write `phargus-verify/references/verification.md` the same way.
  Then run `npm run check:generated` from `src/phargus` and fix any mismatch it names.
- `CHANGELOG.md`: add one `### Fixed` bullet under `## [Unreleased]`, in the style of the CORE-235 "phargus 0.1.1"
  entry. It says that a raw sample delayed by a synchronous stall, and explained by its own `eventLoop.max`, now
  counts in `quality.stalledSamples` and `quality.stalledMs` instead of `quality.gaps`, that sample coverage counts
  that stalled time, and that before, such a recording made `compare` inconclusive ("measurement gaps").
- Run, from `src/phargus`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:integration`, `npm run check:generated`, `npm run check:skills`, `npm run check:package` (the SPEC's
  done list).

## Files

- `src/phargus/runtime/records.mjs` — `quality()` gains `stalledSamples`/`stalledMs`; `qualityTracker` applies the stalled-sample rule to raw samples
- `src/phargus/runtime/summary.mjs` — both sample-coverage checks count `sampleCount × samplingIntervalMs + quality.stalledMs`
- `src/phargus/runtime/types.d.ts` — `Quality` declares numeric `stalledSamples` and `stalledMs`
- `src/phargus/knowledge/data.md` — states the stalled-sample rule, names both fields, drops the "blocked loop" sentence
- `src/phargus/knowledge/verification.md` — a late sample explained by its own stall does not make compare inconclusive; coverage includes `stalledMs`
- `plugins/phargus/skills/phargus-diagnose/scripts/records.mjs` — generated copy of runtime/records.mjs
- `plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs` — generated copy of runtime/summary.mjs
- `plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts` — generated copy of runtime/types.d.ts
- `plugins/phargus/skills/phargus-diagnose/references/data.md` — generated copy of knowledge/data.md
- `plugins/phargus/skills/phargus-memory/scripts/records.mjs` — generated copy of runtime/records.mjs
- `plugins/phargus/skills/phargus-memory/scripts/summary.mjs` — generated copy of runtime/summary.mjs
- `plugins/phargus/skills/phargus-memory/scripts/types.d.ts` — generated copy of runtime/types.d.ts
- `plugins/phargus/skills/phargus-memory/references/data.md` — generated copy of knowledge/data.md
- `plugins/phargus/skills/phargus-rules/scripts/records.mjs` — generated copy of runtime/records.mjs
- `plugins/phargus/skills/phargus-rules/scripts/summary.mjs` — generated copy of runtime/summary.mjs
- `plugins/phargus/skills/phargus-rules/scripts/types.d.ts` — generated copy of runtime/types.d.ts
- `plugins/phargus/skills/phargus-rules/references/data.md` — generated copy of knowledge/data.md
- `plugins/phargus/skills/phargus-setup/scripts/records.mjs` — generated copy of runtime/records.mjs
- `plugins/phargus/skills/phargus-setup/scripts/summary.mjs` — generated copy of runtime/summary.mjs
- `plugins/phargus/skills/phargus-setup/scripts/types.d.ts` — generated copy of runtime/types.d.ts
- `plugins/phargus/skills/phargus-setup/references/data.md` — generated copy of knowledge/data.md
- `plugins/phargus/skills/phargus-verify/scripts/records.mjs` — generated copy of runtime/records.mjs
- `plugins/phargus/skills/phargus-verify/scripts/summary.mjs` — generated copy of runtime/summary.mjs
- `plugins/phargus/skills/phargus-verify/scripts/types.d.ts` — generated copy of runtime/types.d.ts
- `plugins/phargus/skills/phargus-verify/references/data.md` — generated copy of knowledge/data.md
- `plugins/phargus/skills/phargus-verify/references/verification.md` — generated copy of knowledge/verification.md
- `CHANGELOG.md` — one `### Fixed` bullet under `## [Unreleased]` for the stalled-sample rule

### Explicitly not touched

- `src/phargus/test/stalled-samples.test.mjs` — the AC tests; `/pharn-test` writes them (AC-TESTS.md), never the build
- `src/phargus/test/data.test.mjs` — existing gap tests keep passing unchanged (SPEC Constraints)
- `src/phargus/test/sampling-interval.test.mjs` — existing gap tests keep passing unchanged (SPEC Constraints)
- `src/phargus/test/summary-regressions.test.mjs` — existing coverage tests keep passing unchanged
- `src/phargus/runtime/capture.mjs` — already calls `qualityTracker`, so its manifest gains the fields with no edit
- `src/phargus/runtime/operations.mjs` — collect and rules replay; feeding them through the tracker is S4.4 (non-goal)
- `src/phargus/runtime/phargus.mjs` — the CLI already summarizes both sides before compare; no change
- `src/phargus/knowledge/rules.md` — window/rules gap wording; window records are unchanged (non-goal)
- `src/phargus/scripts/generate.mjs` — reused as the `check:generated` verifier; never edited
- `src/phargus/VERIFICATION.json` — the behavioral fingerprint changes with the runtime; `check:evals` is not in the done list

## Acceptance mapping

- AC-1 (unit): `quality()` returns `stalledSamples: 0, stalledMs: 0`. `qualityTracker` at intervalMs 1000 counts a
  sample 1800 ms after its predecessor with max 800 ms as stalled (lateness 800 ≤ 800 + 500) with `stalledMs` 800. A
  sample 58 s late with a small max is a gap (57000 > max + 500). A backwards or repeated timestamp is a gap (rule
  step 1). Lateness 1300 at max 800 ms is stalled and 1301 is a gap (inclusive `>` boundary). Lateness ≤ 500 changes
  nothing. The window branch is untouched, so a window hole is still `gaps` 1 and never touches the stalled counters.
- AC-2 (integration): one 800 ms late tick with its 800 ms stall is stalled, not a gap, so `evidenceProblems` adds no
  "measurement gaps". The period is 30 800 ms, within 5% of 30 000 and of the after's 30 000. Sample coverage is
  30 × 1000 + 800, so compare is `comparable` with `requires-goal-assessment`. With 26 samples and four 800 ms
  stalled ticks, coverage is 26 000 + 3 200 = 29 200 against both the declared 30 000 and the after's 30 × 1000 +
  0 = 30 000. Both differences (800) are within 1 500, so neither coverage reason appears. Bare counts (26 000 against
  30 000) would have raised both. The median spacing stays at 1000.
- AC-3 (integration): `types.d.ts` declares both fields. data.md names both fields and loses the "blocked loop"
  sentence. verification.md states the stalled-sample sentence. Every generated copy is written to match, so
  `npm run build` then `npm run check:generated` exits 0.

## Risks & open questions

- Test-stage runner (flag for `/pharn-test`): the repo root's `test` script, which is the `unit`/`integration`
  level gate, globs only `.github/scripts`, `plugins/pharn-ci/tests` and `plugins/pharn-ci/evals/fixtures`. It does not
  run `src/phargus/test/*.test.mjs`. The SPEC's Assumptions already say the test stage runs from `src/phargus`.
  Whether the red run and lock can do that is the test stage's call. If they cannot, it is a stop for the human, not
  something the build can fix: the root `test` script is test infrastructure and stays out of this plan.
- Generator scope (advisory): the build must not run `npm run build`, because it rewrites generated files outside
  `## Files`. The listed copies are written by hand to the source bytes and checked with `npm run check:generated`.
  If prettier would reformat a source, check:generated names the copy, and the build fixes the source formatting
  first (format:check must pass anyway).
- Existing tests under the new rule, checked by arithmetic against the live fixtures (default `eventLoop.max`
  100 ms):
  - data.test.mjs `[0, 1000, 3000, 4000]` at 1000: lateness 1000 > 600, still `gaps` 1.
  - The sampling-interval capture flagged at 250 ms over `[0, 500, 1000, 1500]`: lateness 250 > 100 + 125, still
    `gaps` 3. The margin is only 25 ms.
  - summary-regressions dense `[0..3000]` against sparse `[0, 1500, 3000]`: coverage 4000 against 3000, still
    "different recorded sample coverage".
  - The jitter test is unchanged.
  - No existing assertion should flip. If one does, the build stops and reports it; it never edits a test (SPEC
    non-goal).
- `CHANGELOG.md` is not named in the SPEC's Scope. It is included because the previous phargus fix (CORE-235,
  cb521e5) recorded its behavior change there under `[Unreleased]`. The grill or the human may drop it.
- The `VERIFICATION.json` behavior fingerprint will no longer match the shipped runtime, so `npm run check:evals`
  will fail until a reviewed eval run is committed. The same happened after CORE-235. That check is not in the SPEC's
  done list and is out of this increment.
- AC-3 test shape: the test should verify generated copies with `node scripts/generate.mjs --check` or with
  `generate(true)`, never with `npm run build`, so the test never writes into `plugins/`. CORE-261 retired wording
  acceptance tests, and the SPEC leaves AC-3's form to the test stage.
