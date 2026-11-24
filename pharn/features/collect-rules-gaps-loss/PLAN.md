---
spec_id: collect-rules-gaps-loss
spec_content_hash: 36e48395c99e6675acedf9c5b02dbd32a4a01e3b25d3cac86630b9bda8c1bca7
applied_lessons: none
---

## Approach

ADVISORY (model work). The plan follows the approved SPEC (CORE-237, S4.4) and adds nothing to it.

Nothing new is counted. The one tracker, `qualityTracker(status, intervalMs)` in `src/phargus/runtime/records.mjs`
(S4.3, CORE-236), already holds the gap, stall and loss rules that `summarize` and `capture` use. This change makes
`collect` and the window reader `rules` uses feed it the records they read. `records.mjs`, `summary.mjs`,
`capture.mjs` and `types.d.ts` are not edited (SPEC Constraints: one tracker, no second gap or loss rule).

**`collect` (`src/phargus/runtime/operations.mjs`).** It already builds `const status = quality()` and returns it as
`quality`. Add `intervalMs?: number` to its options JSDoc. Create
`const tracker = qualityTracker(status, options.intervalMs ?? 1000)` next to `status`. In the inner `samples()`
generator, call `tracker.add(record)` once per record, after the `controller.signal.aborted` check and before the
`sample`/`span` branches. Both inputs go through that one generator: `fileEvents` (with `--file`) and `following`
(with `--follow`). So both modes count `gaps`, `stalledSamples`, `stalledMs` and `loss` exactly as `summarize` does
for the same records (AC-1). The collector, its windows, spans, alerts and sinks get exactly the same input as today
(AC-5).

**The window reader `readWindows`.** The new signature is

```js
readWindows(file, api, windowMs, maxEvents = 10_000, intervalMs = 1000, status = quality());
```

It keeps returning `Window[]`. The existing calls `(file, api, windowMs)` and `(file, api, windowMs, maxEvents)` keep
working unchanged (SPEC Constraints), and the quality record is the trailing argument (AC-6). Inside, create
`const tracker = qualityTracker(status, intervalMs)` and call `tracker.add(record)` for every record `fileEvents`
yields, before the existing `window`/`sample` push. The tracker sees **only the file's records**. The windows that
`api.createWindowAggregator` builds from raw samples are never fed to it. That matters for AC-4: samples 5000 ms
apart aggregated at `--window-ms` 1000 give non-contiguous windows, which the window gap rule would count as gaps.
The tracker judges the samples themselves, at `intervalMs`. `status` is the caller's record, filled in place. The
local `const status = quality()` goes away.

**The `rules` refusal.** `readWindows` keeps refusing when `status.invalidRecords || status.truncated`, and still
throws before the mixed-input check. The message keeps the prefix and names each cause found (SPEC Assumptions: both
when both apply):

```js
const causes = [];
if (status.invalidRecords)
  causes.push(
    'the input has invalid lines (' + status.invalidRecords + '); rules does not apply --allow-logs, ' +
      'so remove or fix every line that is not a valid Phargus record',
  );
if (status.truncated)
  causes.push('the event cap (' + maxEvents + ' events) was reached; raise it with --max-events');
throw new Error('rule replay requires valid, untruncated input: ' + causes.join('; '));
```

The build may adjust the wrapping for prettier, but not the words. The existing assertions `/untruncated/`
(event-limits.test.mjs:110) and `/valid, untruncated input/` (runtime.test.mjs, the rules CLI cap test) still match
(AC-7).

**`replayRules`.** Add `intervalMs?: number` to its options JSDoc. Build `const status = quality()` and call
`readWindows(options.file, api, options.windowMs ?? 1000, options.maxEvents, options.intervalMs ?? 1000, status)`.
Passing `options.maxEvents` when it is `undefined` still uses the 10,000 default parameter. Add `quality: status` to
both results, right after `windows`: the `alerts` result and the `sandbox` result. `alerts`, `results` and `ok` are
computed from the same `windows` array as today (AC-2, AC-3, AC-5; non-goal: no change to alert evaluation or sandbox
execution). With window records only, the tracker never sees a sample, so `loss.known` stays false and
`loss.initial` stays null (AC-2).

**The CLI (`src/phargus/runtime/phargus.mjs`).** `options.intervalMs` (from `number('interval-ms', undefined)`) is
already parsed. Pass `intervalMs: options.intervalMs` into the `collect({...})` call and the `replayRules({...})`
call. `undefined` makes operations.mjs default to 1000; no manifest or conditions are read for these commands (SPEC
Assumptions). Update the comment above `intervalMs:` to say that capture and summarize fall back to declared
conditions, while collect and rules default to 1000.

**Knowledge text** (`src/phargus/knowledge/`, prose wrapped like its neighbours; prettier `printWidth` 100):

- `rules.md`, the paragraph at lines 21–24: keep "gaps do not automatically reset the upstream evaluator". Add that
  `rules` results (both modes) carry a `quality` block with `gaps`, `stalledSamples`, `stalledMs`, `invalidRecords`,
  `ignoredLogs`, `truncated` and `loss`, counted as summarize counts it. State that **with `quality.gaps` above 0 a
  `forWindows` alert may span a hole**, so do not describe it as a continuous wall-clock duration. Raw samples are
  judged at `--interval-ms` (default 1000).
- `tools.md`: in the interval paragraph (lines 51–55), add that the precedence applies to capture, summarize and
  compare, and that **`--interval-ms` also applies to `collect` and `rules`, defaulting to 1000** (no manifest or
  conditions). In the cap/logs paragraph (lines 33–37), add that `rules` does not apply `--allow-logs`, and that its
  refusal names the cause: invalid lines, or the event cap (raise it with `--max-events`). In the collect paragraph
  (lines 66–72), add that the collect result's `quality` reports gaps, stalled samples and loss as summarize does.

**Generated copies.** The `plugins/phargus` copies must equal the generator's output (`scripts/generate.mjs`): the
source run through prettier. `npm run build` rewrites every generated file in the plugin, which is far more than
this plan's `## Files`. So, as in S4.3, the build writes each listed copy with the Write tool, using the exact bytes
of its prettier-clean source. Then it runs `npm run check:generated` (read-only) to prove they match. Once they match,
AC-8's `npm run build` rewrites identical bytes.

## Applied lessons

- none: `check-lessons-index.mjs --verdict` returned `NO_CANON`. This project has no promoted memory-bank lessons
  yet, so there were none to apply.

## Steps

- `src/phargus/runtime/operations.mjs`:
  - Import `qualityTracker` from `./records.mjs` alongside the existing names.
  - `collect`: add `intervalMs?: number` to the options JSDoc. Create the tracker next to `status`, and call
    `tracker.add(record)` in `samples()` after the abort check.
  - `readWindows`: add the `intervalMs = 1000` and `status = quality()` trailing parameters with JSDoc
    (`@param {number} [intervalMs] @param {import('./types.js').Quality} [status]`). Feed every file record to a
    tracker built from them. Replace the bare refusal with the cause-naming message above. Leave the
    mixed-input, aggregator and empty checks as they are.
  - `replayRules`: add `intervalMs?: number` to the JSDoc, pass `status` and the interval to `readWindows`, and add
    `quality: status` to both results.
  - Update the `readWindows` doc comment in one sentence: it fills the caller's quality record through the shared
    tracker.
- `src/phargus/runtime/phargus.mjs`: pass `intervalMs: options.intervalMs` to `collect` and `replayRules`, and
  reword the `intervalMs` comment.
- `src/phargus/knowledge/rules.md` and `src/phargus/knowledge/tools.md`: make the text changes in Approach.
- Run `npx prettier --check --config .prettierrc.json` on each edited source, named one by one, from `src/phargus`.
  If prettier reports a file, run `--write` on that file alone.
- The generated copies: write `scripts/operations.mjs`, `scripts/phargus.mjs` and `references/tools.md` for each of
  the five skills (phargus-diagnose, phargus-memory, phargus-rules, phargus-setup, phargus-verify), and
  `phargus-rules/references/rules.md`, each with the new source bytes. Then run `npm run check:generated` from
  `src/phargus` and fix any mismatch it names.
- `CHANGELOG.md`: add one bullet at the end of `### Fixed` under `## [Unreleased]`, after the CORE-236 bullet and in
  its style, starting `phargus 0.1.1:` and naming CORE-237. It says that `collect` (from `--file` and `--follow`) and
  `rules` (both modes) now count `quality.gaps`, the stalled counters and `loss` through the same tracker as
  `summarize`; that `rules` results gain a `quality` block; that `--interval-ms` now reaches both, defaulting to 1000;
  and that the `rules` refusal names its cause. It says that before, `collect`'s `gaps` and `loss` always stayed at
  their initial values and `rules` reported no quality. It also says alert evaluation is unchanged.
- Run, from `src/phargus`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run prepare:integration` (only if `.cache/integration.json` is missing), `npm run test:integration`,
  `npm run check:generated`, `npm run check:skills`, `npm run check:package` (the SPEC's done list).

## Files

- `src/phargus/runtime/operations.mjs` — collect and the window reader feed the shared quality tracker; readWindows takes trailing `intervalMs` and `status`; rules results carry `quality`; the refusal names its cause
- `src/phargus/runtime/phargus.mjs` — the CLI passes `--interval-ms` to collect and rules
- `src/phargus/knowledge/rules.md` — rules results carry `quality`; with `quality.gaps` above 0 a `forWindows` alert may span a hole
- `src/phargus/knowledge/tools.md` — `--interval-ms` also applies to collect and rules (default 1000); rules ignores `--allow-logs` and its refusal names the cause; collect's quality reports gaps and loss
- `plugins/phargus/skills/phargus-diagnose/scripts/operations.mjs` — generated copy of runtime/operations.mjs
- `plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
- `plugins/phargus/skills/phargus-diagnose/references/tools.md` — generated copy of knowledge/tools.md
- `plugins/phargus/skills/phargus-memory/scripts/operations.mjs` — generated copy of runtime/operations.mjs
- `plugins/phargus/skills/phargus-memory/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
- `plugins/phargus/skills/phargus-memory/references/tools.md` — generated copy of knowledge/tools.md
- `plugins/phargus/skills/phargus-rules/scripts/operations.mjs` — generated copy of runtime/operations.mjs
- `plugins/phargus/skills/phargus-rules/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
- `plugins/phargus/skills/phargus-rules/references/tools.md` — generated copy of knowledge/tools.md
- `plugins/phargus/skills/phargus-rules/references/rules.md` — generated copy of knowledge/rules.md
- `plugins/phargus/skills/phargus-setup/scripts/operations.mjs` — generated copy of runtime/operations.mjs
- `plugins/phargus/skills/phargus-setup/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
- `plugins/phargus/skills/phargus-setup/references/tools.md` — generated copy of knowledge/tools.md
- `plugins/phargus/skills/phargus-verify/scripts/operations.mjs` — generated copy of runtime/operations.mjs
- `plugins/phargus/skills/phargus-verify/scripts/phargus.mjs` — generated copy of runtime/phargus.mjs
- `plugins/phargus/skills/phargus-verify/references/tools.md` — generated copy of knowledge/tools.md
- `CHANGELOG.md` — one `phargus 0.1.1:` bullet under `## [Unreleased]` / `### Fixed` naming CORE-237

### Explicitly not touched

- `src/phargus/runtime/records.mjs` — `qualityTracker` and `quality()` are reused as they are (SPEC non-goal: no change to the tracker's rules)
- `src/phargus/runtime/summary.mjs` — summarize and compare are unchanged (SPEC non-goal)
- `src/phargus/runtime/capture.mjs` — capture is unchanged (SPEC non-goal)
- `src/phargus/runtime/types.d.ts` — `Quality` already has every field; collect and rules results are untyped JSDoc returns
- `src/phargus/test/event-limits.test.mjs` — the 10,000-event replay default test keeps passing unchanged (SPEC Constraints)
- `src/phargus/test/operations.test.mjs` — existing tests; not edited (see Risks: the AC tests go in new files)
- `src/phargus/test/integration/runtime.test.mjs` — existing tests; not edited (see Risks: the AC tests go in new files)
- `src/phargus/test/collect-rules-quality.test.mjs` — AC unit tests; `/pharn-test` writes them (AC-TESTS.md), never the build
- `src/phargus/test/integration/collect-rules-quality.test.mjs` — AC integration tests; `/pharn-test` writes them, never the build
- `src/phargus/scripts/generate.mjs` — reused as the `check:generated` verifier; never edited
- `src/phargus/package.json` — no plugin version bump (SPEC non-goal); no script change
- `src/phargus/VERIFICATION.json` — the behavioural fingerprint changes with the runtime; `check:evals` is not in the done list
- `plugins/phargus/skills/phargus-rules/SKILL.md` — skill steps stay as they are; the references carry the new text

## Acceptance mapping

- AC-1 (integration): every record from `fileEvents` (`--file`) or `following` (`--follow`) passes through
  `tracker.add` in `samples()`, with interval 1000. The 58 s hole is lateness 57 000 > small max + 500, so `gaps` is 1.
  The dropped counters go through the same loss branch as summarize, so `loss` deep-equals summarize's (`known` true,
  `delta` 42/420, `resets` 1). The `--follow` run needs `--duration-ms` to end. A `--file` run also waits for its
  duration, so the test passes `durationMs` and `port: 0` for both.
- AC-2 (integration): both `replayRules` results gain `quality: status`, the full `quality()` shape. With window
  records only, no sample reaches the tracker, so `loss.known` is false and `loss.initial` is null.
- AC-3 (integration): the window branch counts 1700003600000 ≠ 1700000001000 as one gap. 1700003601000 equals the
  previous end, so it is not a gap. The evaluator receives the same three windows as before, so it fires at
  1700003600000 (two consecutive breaches, gaps do not reset it) and resolves at 1700003601000.
- AC-4 (integration): the CLI passes `--interval-ms 5000` to both commands. Spacing 5000 at interval 5000 is lateness
  0, so `gaps` is 0. The `rules` tracker judges the raw samples, not the aggregated windows. The `collect` CLI run
  needs `--duration-ms` and `--port 0`.
- AC-5 (integration): `collect` and `rules` give the collector, evaluator and runner the same input as before. The
  default interval 1000 judges 1000 ms spacing as lateness 0, so `gaps` is 0. A clean file gives `invalidRecords` 0
  and `truncated` false. The only additions are the `quality` block on `rules` and the real `loss` values on
  `collect`.
- AC-6 (unit): `readWindows(file, api, 1000, undefined, undefined, status)` (or with explicit `10_000, 1000`)
  returns the windows and fills `status.gaps` with 1 for one hole between windows. The window path never calls `api`,
  so a stand-in `{}` collector module works, as in event-limits.test.mjs.
- AC-7 (unit): an invalid line gives the prefix plus "the input has invalid lines (1); rules does not apply
  --allow-logs …". Over the cap gives the prefix plus "the event cap (N events) was reached; raise it with
  --max-events".
- AC-8 (integration): the copies are written to match, so `npm run build` then `npm run check:generated` exits 0.
  rules.md and its copy state the `quality.gaps` / `forWindows` hole sentence. tools.md and its five copies state
  that `--interval-ms` also applies to collect and rules with default 1000. CHANGELOG has the CORE-237 bullet.

## Risks & open questions

- **The AC test file location differs from the SPEC (flag for the grill and the human).** The SPEC's Constraints say
  "Unit tests go in `src/phargus/test/operations.test.mjs`; integration tests in
  `src/phargus/test/integration/runtime.test.mjs`." Both files already exist. `/pharn-plan`'s trusted Step 4c and
  `pharn/pharn-contracts/ac-tests.md` require AC-TESTS.md to map only **new** files. A mapped existing file would be
  rewritten by `/pharn-test`, and `/pharn-regress` would drop it, with every existing test in it, from the regression
  comparison. That would also risk the SPEC's own non-goal, "Deleting or editing any existing test". So AC-TESTS.md
  maps two new files in the same suites:
  - `src/phargus/test/collect-rules-quality.test.mjs`, run by `npm test` (`test/*.test.mjs`);
  - `src/phargus/test/integration/collect-rules-quality.test.mjs`, run by `npm run test:integration`
    (`test/integration/*.test.mjs`).

  The intent (unit tests in the unit suite, integration tests in the integration suite, existing tests untouched) is
  kept. If the human wants the tests in those exact files, they can move them after the pipeline, or amend the SPEC.
- Test-stage runner (as in S4.3): the repository root's `test` script, which is the level gate, does not run
  `src/phargus` tests. The SPEC's Assumptions say the test stage runs from `src/phargus`. If the red run cannot do
  that, it is a stop for the human, not a build fix: the root `test` script is test infrastructure and stays out of
  this plan.
- The integration AC tests need the prepared Phargus project (`src/phargus/.cache/integration.json`, present in
  this worktree) and the `project` path it records, as runtime.test.mjs reads it.
- Generator scope (advisory): the build must not run `npm run build`, because it rewrites generated files outside
  `## Files` (plugin.json, LICENSE, `agents/openai.yaml`, unchanged modules). The AC-8 test should verify with
  `node scripts/generate.mjs --check`, never `npm run build`, so it never writes into `plugins/`.
- `collect` without `--duration-ms` waits for SIGINT even in `--file` mode (unchanged). Every AC test that runs
  `collect` must bound it.
- AC-1's `--follow` read is timing-bound: the tail polls every 100 ms. The test's `durationMs` must leave time to
  read the whole file. Existing tests use 100–200 ms for one sample; a 60-sample file is still one 64 KiB read.
- `VERIFICATION.json`'s behaviour fingerprint will no longer match the shipped runtime, so `npm run check:evals`
  fails until a reviewed eval run is committed. The same happened after CORE-235 and CORE-236. That check is not in
  the SPEC's done list.
