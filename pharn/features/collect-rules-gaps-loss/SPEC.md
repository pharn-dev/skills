---
spec_id: collect-rules-gaps-loss
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

CORE-237 (S4.4), in `src/phargus`. The phargus helper's `collect` and `rules` commands report evidence quality
that is wrong or missing. `collect` returns a `quality` record, but the raw samples and spans it reads (from a file,
or with `--follow`) never reach the shared quality tracker that `summarize` uses (with the S4.3 stall rule,
CORE-236), so `gaps` and the `loss` block always keep their initial values, even for a recording with a 58 s hole
and dropped records. `rules` reads its input through the window reader, which builds a quality record and then
drops it, so neither `--mode alerts` nor `--mode sandbox` returns any quality field. And `--interval-ms`, which the
CLI already parses, reaches neither command, so a recording sampled every 5000 ms cannot be judged at its own
interval.

The user wants `collect` and `rules` to report gaps and loss exactly as `summarize` does for the same records, so an
agent replaying a rule or watching a collection can see when its evidence has holes or lost records, while alert
evaluation stays exactly as the live collector does it. When `rules` refuses invalid or truncated input, the user
wants the error to say which of the two caused it and how to proceed.

## Scope

**In scope:**

- Feeding every record `collect` reads, from `--file` and with `--follow`, through the shared quality tracker, so its
  returned `quality` carries real `gaps`, stall counters and `loss`.
- The window reader `rules` uses filling a quality record the caller can pass in, through the same tracker, while
  still returning the list of windows.
- `--interval-ms` (default 1000) reaching `collect` and `rules` and setting the interval the tracker judges raw
  samples by.
- A `quality` block in the `rules` result in both `alerts` and `sandbox` modes.
- The `rules` error for invalid or truncated input keeping its current prefix and naming its cause: invalid lines
  (`rules` does not apply `--allow-logs`), or the event cap, naming `--max-events`.
- `knowledge/rules.md` and `knowledge/tools.md` describing the new output and flag scope, the regenerated
  `plugins/phargus` copies, and a `phargus 0.1.1:` bullet under `[Unreleased]` / `### Fixed` in `CHANGELOG.md`.

**Out of scope (non-goals):**

- Any change to alert evaluation or sandbox rule execution; a gap does not reset a `forWindows` count (replay must
  keep matching the live collector).
- Any change to the quality tracker's own rules (the S4.3 stall rule, the window gap rule, loss and counter resets).
- Inferring loss where the input carries no dropped counters; unknown loss stays `loss.known` false.
- Taking the interval for `collect` or `rules` from a capture manifest or declared conditions.
- Any change to `summarize`, `compare`, `capture` or `heap`.
- A plugin version bump (the plugin is already at 0.1.1, unreleased).
- Deleting or editing any existing test.

## Acceptance Criteria

- **AC-1** Given a raw recording whose samples are 1000 ms apart except for one 58 s hole between two consecutive
  samples (each with a small `eventLoop.max`), and whose dropped counters, across one counter reset, add up to a loss
  delta of 42 samples and 420 spans When `collect` runs on it with `--file` (and again with `--follow`, bounded by
  `--duration-ms`) Then each returned `quality` has `gaps` 1, and its `loss` block deep-equals the `loss` block
  `summarize` returns for the same file (`known` true, `delta` samples 42 and spans 420, `resets` 1)
  - verify: integration
- **AC-2** Given a recording `rules` can replay When `rules` runs in `--mode alerts`, and on the same recording in
  `--mode sandbox` Then each result carries a `quality` block with numeric `gaps`, numeric `invalidRecords`, boolean
  `truncated` and a `loss` block; and for a recording of window records only, `quality.loss.known` is false and
  `quality.loss.initial` is null
  - verify: integration
- **AC-3** Given a recording of window records holding a window starting at 1700000000000 and one starting at
  1700003600000 that both have `eventLoop.max` above 50 ms, followed by a window starting at 1700003601000 that does
  not, and the rule `eventLoop.max > 50000000` (50 ms) with `forWindows` 2 When `rules --mode alerts` replays it
  Then `alerts` is a `firing` alert with `windowStart` 1700003600000 followed by a `resolved` alert with
  `windowStart` 1700003601000, exactly as before this change, and `quality.gaps` is 1
  - verify: integration
- **AC-4** Given a clean raw recording whose samples are exactly 5000 ms apart When the CLI runs `collect` and
  `rules` on it, each with `--interval-ms 5000` Then both results report `quality.gaps` 0
  - verify: integration
- **AC-5** Given a clean raw recording sampled every 1000 ms When `collect` and `rules` (alerts and sandbox) run on it
  without `--interval-ms` Then `collect` returns the same `windows`, `spans` and `alerts` counts as before this change
  and `quality.gaps` 0; and `rules` returns the same `windows` count, the same `alerts` (alerts mode) and the same
  `ok` and `results` (sandbox mode) as before this change, plus a `quality` block with `gaps` 0, `invalidRecords` 0
  and `truncated` false
  - verify: integration
- **AC-6** Given a recording of window records with one hole between two consecutive windows When the window reader
  is called with a fresh quality record as its trailing argument Then it returns the list of windows and the quality
  record's `gaps` is 1
  - verify: unit
- **AC-7** Given a recording containing one line that is not a valid record, and separately a recording with more
  events than the replay cap When the window reader reads each Then the first rejects with an error that starts with
  `rule replay requires valid, untruncated input` and says the input has invalid lines and that `rules` does not
  apply `--allow-logs`; the second rejects with an error that starts with the same text, says the event cap was
  reached and names `--max-events`
  - verify: unit
- **AC-8** Given the change is built When `npm run build` and then `npm run check:generated` run from `src/phargus`
  Then `check:generated` exits 0; `src/phargus/knowledge/rules.md` and its generated
  `plugins/phargus/skills/*/references/rules.md` copies state that with `quality.gaps` above 0 a `forWindows` alert
  may span a hole; `src/phargus/knowledge/tools.md` and its generated copies state that `--interval-ms` also applies
  to `collect` and `rules`, defaulting to 1000; and `CHANGELOG.md` has a `phargus 0.1.1:` bullet under
  `[Unreleased]` / `### Fixed` naming CORE-237
  - verify: integration

## Constraints

- One tracker: `collect`, `rules` and `summarize` count quality through the shared quality tracker in
  `src/phargus/runtime/records.mjs`; no second gap or loss rule is written.
- The window reader keeps returning the list of windows (`Window[]`); its existing calls, `(file, api, windowMs)` and
  `(file, api, windowMs, maxEvents)`, keep working unchanged.
- Alert evaluation and sandbox execution receive exactly the windows they receive today.
- The `rules` refusal keeps the prefix `rule replay requires valid, untruncated input`.
- `src/phargus/test/event-limits.test.mjs` (the 10,000-event replay default test at line 100) keeps passing
  unchanged. Unit tests go in `src/phargus/test/operations.test.mjs`; integration tests in
  `src/phargus/test/integration/runtime.test.mjs`. No test is deleted.
- Done when, run from `src/phargus`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:integration` (after `npm run prepare:integration`), `npm run check:generated`,
  `npm run check:skills` and `npm run check:package` all pass.

## Assumptions

- The test runner is `src/phargus`'s own `npm test` / `npm run test:integration` (`node --test`); the repository
  root's `test` script does not run phargus tests, so the test stage runs from `src/phargus`.
- The user's AC7 (the Done-when commands) is kept as the last Constraint, as the S4.3 SPEC did, because it is a
  repository gate rather than an observable behaviour; nothing is dropped.
- The window reader also needs the sampling interval to judge raw samples; it takes it in a way the plan chooses,
  defaulting to 1000, and `rules` passes the `--interval-ms` value. How the reader's signature grows is the plan's
  choice within the Window[] and existing-call constraints.
- `collect` and `rules` take the interval from `--interval-ms`, else 1000; they take no manifest or conditions, so
  the manifest and conditions precedence `summarize` uses does not apply to them.
- The `quality` block `rules` returns is the full quality record (`invalidRecords`, `ignoredLogs`, `truncated`,
  `gaps`, `stalledSamples`, `stalledMs`, `loss`), the same shape `collect` and `summarize` return.
- In AC-3, "firing at" and "resolved at" read the alert's `windowStart`, as the existing alert replay integration
  test does; the third, nonbreaching window at 1700003601000 is what produces the resolved alert the user expects.
- In AC-5, "clean" means consecutive samples exactly the interval apart and no invalid lines. `collect`'s `quality`
  is not claimed unchanged: its `loss` block now reflects the dropped counters the samples carry, which is the fix.
- AC-6 and AC-7 call the window reader directly with a stand-in collector module, as the existing event-limits test
  does; AC-6's recording of window records with one hole needs no aggregator.
- When a recording is both invalid and over the cap, the refusal names both causes.
- AC-8 names knowledge text, generated files and the CHANGELOG; it is the user's own requested outcome. The
  repository retired wording acceptance tests (CORE-261), so how AC-8 is tested is the test stage's choice.
