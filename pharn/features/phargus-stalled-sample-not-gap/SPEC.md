---
spec_id: phargus-stalled-sample-not-gap
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
spec_kind: quick
---

## Intent

CORE-236 (S4.3). The phargus sampler runs on the event loop it measures, so a synchronous stall delays the next
sample tick by the length of the stall. Today the shared quality tracker counts that late raw sample as a
measurement gap (it arrives more than 1.5 × the sampling interval after the previous one), the summary then
reports `measurement gaps`, and compare is inconclusive. The late sample is not missing evidence: it carries the
stall in its own `eventLoop.max` (nanoseconds). The result is that phargus-verify cannot judge a before/after fix
for a synchronous handler, which is exactly the case it is most needed for.

The user wants a late raw sample whose lateness is explained by the stall it reports to be counted as a stalled
sample, not a gap, so a stall-affected recording can still be compared; and wants a late sample the stall does
not explain, a backwards or repeated timestamp, and dropped-counter loss to keep being treated exactly as today.

The rule, as the user stated it, applied in the shared quality tracker (so the S4.4 follow-up can feed collect
and rules through the same rule): a timestamp at or before the previous sample's stays a gap. For a later
sample, lateness = timestamp − previous timestamp − intervalMs. Lateness ≤ 0.5 × intervalMs is normal.
Otherwise the sample is a gap only when lateness > eventLoop.max / 1e6 + 0.5 × intervalMs; else it is a stalled
sample, which increments a new `quality.stalledSamples` and adds its lateness to a new `quality.stalledMs`.
Stalled samples do not make compare inconclusive, and both sample-coverage checks (a recording against its
declared `durationMs`, and before against after) count sampleCount × samplingIntervalMs + quality.stalledMs
instead of the bare sample count.

## Scope

**In scope:**

- The raw-sample gap rule in the shared quality tracker, with the two new quality counters `stalledSamples` and
  `stalledMs` (both 0 in a fresh quality record).
- The two sample-coverage checks in the summary/compare path counting stalled time as covered time.
- The `Quality` type declaration and the phargus data knowledge naming both new fields.
- Rewriting the phargus data knowledge's statement that "a schedule gap can also result from a blocked loop",
  and the verification knowledge's statement of what makes a comparison inconclusive, to state the new rule.
- Regenerating the generated plugin copies of the changed knowledge.

**Out of scope (non-goals):**

- Feeding collect and rules through the shared quality tracker (the S4.4 follow-up).
- Any change to the window-record gap rule; window records behave exactly as today.
- Any change to how a backwards or repeated timestamp, or dropped-counter loss and counter resets, are counted.
- Any change to the sampler itself, its scheduling, or the wire format.
- A new compare reason or verdict for stalled samples.
- Deleting or editing any existing test.

## Acceptance Criteria

- **AC-1** Given a quality record from `quality()` and a quality tracker at intervalMs 1000 When it is fed raw
  samples Then the returned quality counts them as follows: a sample 1800 ms after its predecessor whose
  `eventLoop.max` is 800 ms leaves `gaps` 0 and yields `stalledSamples` 1 and `stalledMs` 800; a sample 58 s
  after its predecessor with a small `eventLoop.max` yields `gaps` 1 and `stalledSamples` 0; a sample whose
  timestamp is at or before its predecessor's yields `gaps` 1; with `eventLoop.max` 800 ms, a sample whose
  lateness is exactly 1300 ms (max + 0.5 × interval) is a stalled sample and one 1301 ms late is a gap; a sample
  at most 500 ms late changes none of the three counters; a fresh `quality()` has `stalledSamples` 0 and
  `stalledMs` 0; and window records with a hole between them still yield `gaps` 1 and never change
  `stalledSamples` or `stalledMs`
  - verify: unit
- **AC-2** Given before/after raw recordings under the same conditions (durationMs 30000, intervalMs 1000) When
  they are summarized and compared Then: for a before of 30 samples in which one tick is 800 ms late and that
  sample's `eventLoop.max` is 800 ms, against an after of 30 on-time samples, compare returns `comparable` true
  and a `verdict` other than `inconclusive`, and the before summary's quality has `gaps` 0 and `stalledSamples`
  1; and for a 30 s before of 26 samples in which four ticks are each 800 ms late and each late sample carries its
  800 ms stall in `eventLoop.max`, against an after of 30 on-time samples, compare returns `comparable` true with
  no `recorded sample coverage differs from declared durationMs` and no `different recorded sample coverage`
  reason (coverage 26 × 1000 + 3200 is within tolerance of 30000)
  - verify: integration
- **AC-3** Given the change is built When `npm run build` and then `npm run check:generated` run from
  `src/phargus` Then `check:generated` exits 0; the `Quality` type in `src/phargus/runtime/types.d.ts` declares
  numeric `stalledSamples` and `stalledMs`; `src/phargus/knowledge/data.md` and every generated
  `plugins/phargus/skills/*/references/data.md` copy name both `stalledSamples` and `stalledMs` and no longer
  contain the sentence "A schedule gap can also result from a blocked loop"; and
  `src/phargus/knowledge/verification.md` states that a late sample explained by its own stall does not make the
  comparison inconclusive
  - verify: integration

## Constraints

- The rule lives in the shared quality tracker in `src/phargus/runtime/records.mjs`, not in summarize, so the
  S4.4 follow-up can reuse it unchanged.
- `eventLoop.max` is in nanoseconds; intervals and timestamps are in milliseconds.
- New tests go in a new `src/phargus/test/stalled-samples.test.mjs`. The existing gap tests in
  `src/phargus/test/data.test.mjs` and `src/phargus/test/sampling-interval.test.mjs` keep passing unchanged. No
  test is deleted.
- Done when, run from `src/phargus`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:integration`, `npm run check:generated`, `npm run check:skills` and `npm run check:package` all
  pass.

## Assumptions

- The test runner is `src/phargus`'s own `npm test` / `npm run test:integration` (`node --test`); the repository
  root's `test` script does not run phargus tests, so the test stage runs from `src/phargus`.
- In AC-1 and AC-2, "N ms late" means the late sample's timestamp is intervalMs + N after its predecessor's, and
  later ticks are scheduled from the late one (each later sample is again intervalMs after its predecessor); this
  matches the 26-sample, 30 s shape of AC-2's second case.
- The 1 ms step past the tolerance boundary in AC-1 is measured on the sample timestamp (whole milliseconds).
- The before-against-after coverage check compares sampleCount × samplingIntervalMs + quality.stalledMs of each
  side, with the existing relative coverage tolerance (5%) unchanged.
- The median-based observed-spacing check is left as is; with at most four late ticks in 26–30 samples the
  median spacing stays at intervalMs, so it raises no reason in AC-2.
- AC-3 names knowledge text and generated files; it is the user's own requested outcome. The repository retired
  wording acceptance tests (CORE-261), so how AC-3 is tested is the test stage's choice.
- Capture manifests written before this change lack the two new fields; summaries recompute raw-sample quality
  from the records, so no migration is asked for.
