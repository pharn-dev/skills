---
spec_id: phargus-summary-bounded-memory
spec_content_hash: "49c3f80494227990032c5e686ebddbda22ad0513534c4b4d4177c8e8d3740ef1"
applied_lessons: none
---

## Approach

ADVISORY (model work). This plan comes from the Approved SPEC, which `check-spec-approved.mjs` gated GREEN this run.

`summarizeEvents` in `src/phargus/runtime/summary.mjs` keeps one object per span, holding its method and path strings
(lines 75-76, 153-160). After the loop, `routeBreakdown` (lines 34-62) builds one group per distinct method and path,
each with its own durations array. On a recording with unique paths, both grow with the number of requests. The fix
changes only how spans and routes are held. Every number in the output, and how it is computed, stays the same:

1. **One function turns a method and path into a route id.** A small factory, `routeIndex()`, is local to
   `summary.mjs`. It holds a `Map` from the key `JSON.stringify([method, path])` (the key the current code already
   uses) to an integer id, and a `names` array mapping id to `{ method, path }`. Its `id(method, path)` returns the
   known id. If the pair is new and fewer than `TRACKED_ROUTE_LIMIT` (10,000) routes are tracked, it assigns the next
   id. Otherwise it returns the reserved id `TRACKED_ROUTE_LIMIT`, which stands for the `(other)` route. No other code
   turns strings into route ids, so S4.5 can later shorten long strings inside this one function (SPEC Constraints).
   Ids are assigned while the file is read, in recording order. A route first seen in a span outside the runtime
   period therefore still takes a tracked place (SPEC Assumptions).
2. **Per span, only numbers are kept.** The `spans` array of objects is replaced by four parallel number arrays:
   start time (ms), duration (ns), status code, and route id. The span branch pushes onto each array, calls
   `routeIndex.id(...)` once, and keeps no reference to `record.data` or its strings. `endMs` is derived where it is
   needed, with the existing expression `startMs + durationNs / 1_000_000`, so the floating-point results stay
   byte-identical. `spanStart` and `spanEnd` are updated exactly as now.
3. **Selection and route aggregation run in one pass over the arrays, after the loop.** A span is selected by the
   existing test, `startMs >= start && startMs < end && endMs <= end`, in recording order. Each selected span:
   - pushes its duration onto the whole-recording `durations` array;
   - counts toward the whole-recording `errors` when its status is `>= 500`;
   - adds its duration to its route group, and counts toward that group's errors when it is a 5xx. The groups are a
     `Map<number, {durations: number[], errors: number}>` keyed by route id, at most 10,001 entries.

   `requests.inPeriod` becomes `durations.length`, and `outsidePeriod` is `counts.spans - inPeriod`. The metrics
   (`observedRequestP50Ns`, `observedRequestP99Ns`, `observedRequestRatePerSecond`, `observedServerErrors`) use the
   same expressions over the same values, so they stay exact past the cap (SPEC Constraints).
4. **`routeBreakdown` takes the groups and the `names` array.** It builds `Route` objects with the same key order
   (`method, path, count, p50Ns, p99Ns, maxNs, serverErrors`), and with the same `percentile`, max and sort comparator
   (count desc, p99Ns desc, method, path). The id `TRACKED_ROUTE_LIMIT` maps to method `(other)` and path `(other)`.
   It returns:
   - `routes`, sliced to the existing top-20 `ROUTE_LIMIT`, unchanged;
   - `distinctRoutes = groups.size`: the tracked routes with at least one selected span, plus one for `(other)` when
     it has any;
   - `routesFolded = groups.has(TRACKED_ROUTE_LIMIT)`. It is `true` exactly when at least one in-period span was
     counted in `(other)`, so the flag and the `(other)` row always agree (SPEC Assumptions).

   The comparator is a total order over distinct method and path pairs, so the output order does not depend on the
   order groups were inserted in. That keeps today's output byte-identical when nothing is folded (AC-4). A recorded
   pair that is literally `(other)`/`(other)` gets no special handling (SPEC Assumptions).
5. **Output shape.** In the returned `requests` object, `routesFolded` goes right after `distinctRoutes`. No other
   field moves, is renamed or is removed, and `schemaVersion` stays `1` (SPEC Constraints). `compare` gets the new
   field through `summarizeFile`, with no change of its own: `compareSummaries` embeds both summaries.

`src/phargus/runtime/types.d.ts` gains `routesFolded: boolean` in `Summary['requests']`. The comment at
`src/phargus/runtime/records.mjs:175-177` is corrected. It wrongly says "a file is already bounded and summarizing it
is fast". It will say that a whole file is streamed unless `maxEvents` is given, that a default cap would truncate
evidence, that the summary keeps bounded per-span state instead (numbers only, with tracked routes capped in
`summary.mjs`), and that live SSE keeps its own limit. The code of `fileEvents` does not change, so no default event
cap comes back (SPEC Constraints).

The two knowledge files get the sentences below. Each contains the exact phrase `distinctRoutes is a lower bound`,
next to `routesFolded`, so AC-8 can match the same tokens in both:

- `src/phargus/knowledge/data.md` lines 26-28 become:
  "requests.routes groups the same selected spans by exact method and path (top 20 by count, then p99Ns);
  requests.distinctRoutes is the number of groups. The helper tracks the first 10,000 distinct method and path pairs
  in recording order; spans of later pairs are counted in one route whose method and path are both (other), and
  requests.routesFolded is true. The route table is then partial and requests.distinctRoutes is a lower bound;
  request counts, percentiles, errors and rate still use every selected span. A route with few spans has unstable
  percentiles; read count before p99Ns."
  Wrap it at the file's existing width, about 90 columns.
- `src/phargus/knowledge/tools.md` lines 62-64 end:
  "…ordered by count then p99Ns; requests.distinctRoutes counts the selected pairs, so truncation is visible. Past
  10,000 tracked pairs, later pairs are counted in one (other) route, requests.routesFolded is true and
  requests.distinctRoutes is a lower bound."

The generated copies under `plugins/phargus` must match their sources. `generate.mjs` copies each runtime file and
each catalog reference into every skill, then formats it with prettier. All 25 affected copies are byte-identical to
their sources today (checked with `cmp` this run). The build therefore writes each copy with the Write tool,
byte-identical to its updated source, and confirms with `npm run check:generated`. It does not run `npm run build`:
that rewrites every generated file (about 63, most of them unchanged), and most of those are outside this plan's
writes-scope.

Finally, one bullet is added under the root `CHANGELOG.md` `[Unreleased]` → `### Fixed`, after the last existing
`` `phargus` 0.1.1: `` bullet there:
"`phargus` 0.1.1: `summarize --file` and `compare` no longer run out of memory on a large recording. A 1.1 GB
recording of 5,000,000 spans with unique paths aborted with a V8 heap out-of-memory crash (exit 134) and printed no
JSON. A summary now keeps only numbers per span, and the route table tracks at most 10,000 routes: spans of later
routes are counted in one `(other)` route, the new `requests.routesFolded` is `true`, and `requests.distinctRoutes`
is then a lower bound. Whole-recording counts and request percentiles stay exact, and file reads still have no
default event cap (CORE-234)."

## Applied lessons

- none: `check-lessons-index.mjs --verdict` printed `NO_CANON` this run. The project has no
  `pharn/memory-bank/lessons-learned.md` with promoted lessons, so there was nothing to apply.

## Steps

- In `src/phargus/runtime/summary.mjs`:
  - add the constants `TRACKED_ROUTE_LIMIT = 10_000` and `OTHER_ROUTE = '(other)'`, and the factory
    `routeIndex()` (Approach 1), with JSDoc types that pass `tsc --noEmit` under `checkJs`;
  - replace the span objects with the four parallel number arrays (Approach 2);
  - replace the `filter`/`map`/`filter` chain at lines 175-180 with the single selection pass (Approach 3);
  - rewrite `routeBreakdown` to take the groups and names and return `{ routes, distinctRoutes, routesFolded }`
    (Approach 4);
  - add `routesFolded` after `distinctRoutes` in the result (Approach 5).

  Leave `percentile`, `median`, `hotspots`, `spacing`, `evidenceProblems`, `coverageProblems` and
  `compareSummaries` as they are.
- In `src/phargus/runtime/types.d.ts`, add `routesFolded: boolean;` right after `distinctRoutes: number;` in
  `Summary['requests']`.
- In `src/phargus/runtime/records.mjs`, rewrite only the JSDoc sentence at lines 175-177 (Approach). Leave its
  `@param` line and all code unchanged.
- Update the two knowledge passages (Approach). Then write the 25 generated copies (`## Files`), each byte-identical
  to its source.
- Add the CHANGELOG bullet (Approach).
- Run each of these from `src/phargus` and require it to pass (SPEC Constraints): `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration` (after `npm run prepare:integration`,
  which needs the upstream phargus source; see Risks), `npm run check:generated`, `npm run check:skills`,
  `npm run check:package`. From the repository root, run `npx prettier --check CHANGELOG.md` and
  `npx markdownlint-cli2 CHANGELOG.md`, because the root formats and lints the CHANGELOG.
- The AC tests are written before the build by `/pharn-test`, into the new files that `AC-TESTS.md` names. The build
  never edits them.

## Files

- `src/phargus/runtime/summary.mjs` — route ids from one `routeIndex()` function, a 10,000-route cap with an `(other)` route, numbers-only span storage, one-pass selection, `requests.routesFolded`
- `src/phargus/runtime/records.mjs` — correct the `fileEvents` comment at lines 175-177 only
- `src/phargus/runtime/types.d.ts` — `routesFolded: boolean` after `distinctRoutes` in `Summary['requests']`
- `src/phargus/knowledge/data.md` — lines 26-28: the cap, `(other)`, `routesFolded`, `distinctRoutes is a lower bound`
- `src/phargus/knowledge/tools.md` — lines 62-64: the cap, `(other)`, `routesFolded`, `distinctRoutes is a lower bound`
- `plugins/phargus/skills/phargus-setup/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-setup/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-setup/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-setup/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-setup/references/tools.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/references/tools.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-verify/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-verify/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-verify/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-verify/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-verify/references/tools.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-memory/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-memory/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-memory/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-memory/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-memory/references/tools.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-rules/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-rules/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-rules/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-rules/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-rules/references/tools.md` — generated copy of the knowledge file, byte-identical
- `CHANGELOG.md` — one `` `phargus` 0.1.1: `` bullet under `[Unreleased]` → `### Fixed`

### Explicitly not touched

- `src/phargus/test/summary-routes.test.mjs` — existing route tests, kept as they are; see Risks
- `src/phargus/test/summary-regressions.test.mjs` — existing tests, kept; no assertion encodes the old shape
- `src/phargus/test/event-limits.test.mjs` — existing tests, kept; the no-default-cap behaviour is unchanged
- `src/phargus/runtime/capture.mjs` — `capture` and the live SSE limit are out of scope
- `src/phargus/runtime/operations.mjs` — `collect` and rule replay are out of scope
- `src/phargus/runtime/phargus.mjs` — the CLI passes the summaries through unchanged
- `src/phargus/scripts/generate.mjs` — reused as the `check:generated` check, never edited
- `src/phargus/package.json` — no script or dependency change
- `src/phargus/VERIFICATION.json` — release evidence; no release in this increment

## Acceptance mapping

The AC tests live in three new files, named in `AC-TESTS.md`: a unit file for AC-1 to AC-5, an integration file for
AC-6 and AC-7, and a unit file for AC-8 and AC-9.

- AC-1 (10,001 pairs, the last with two spans) → the 10,000 first-seen pairs get tracked ids 0..9999. The 10,001st
  pair's two spans get id 10,000 → one `(other)` group with count 2. `groups.size` is 10,001, so `distinctRoutes` is
  `10001` and `routesFolded` is `true`.
- AC-2 (9,999 or 10,000 pairs) → every pair gets a tracked id, because the cap is reached only on the 10,001st new
  pair. There is no `(other)` group, `routesFolded` is `false`, and `distinctRoutes` equals the number of pairs.
- AC-3 → `inPeriod`, `counts.spans` and the request metrics are computed from the whole-recording `durations` and
  `errors`, which every selected span enters whatever its route. The `(other)` row's `p50Ns`, `p99Ns`, `maxNs` and
  `serverErrors` come from that group's own durations and errors, which hold exactly the folded pair's spans.
- AC-4 (50 pairs, an expected summary committed from 0.1.1 output) → the computation and key order are unchanged, the
  sort comparator is a total order, and `routesFolded` is the only added key. The JSON serialization minus
  `routesFolded` is therefore byte-identical, and `routesFolded` is `false`. `/pharn-test` captures the expected JSON
  from today's code, before the build, as a literal inside the test file.
- AC-5 → the existing fixtures have at most 25 pairs, far below the cap, so their counts, routes, `distinctRoutes`
  and percentiles are unchanged, and `routesFolded: false` is added to every summary. That includes both sides of
  `compare`.
- AC-6 (200,000 unique-path spans, `--max-old-space-size=64`, no `--max-events`) → per span, the state is four
  numbers (about 6.4 MB of arrays). Route state is capped at 10,000 keys and names, plus one `(other)` group. There is
  no event cap, so `counts.spans` is `200000`, `quality.truncated` is `false`, and `routesFolded` is `true`.
- AC-7 → `compare` calls `summarizeFile` once per side, sequentially. Each side has the AC-6 bound, so it exits 0
  with `before.requests.routesFolded` and `after.requests.routesFolded` both `true`.
- AC-8 → both knowledge files name `10,000`, `(other)`, `routesFolded` and `distinctRoutes is a lower bound`
  (Approach). The 25 copies match their sources, so `npm run check:generated` exits 0.
- AC-9 → the CHANGELOG bullet (Approach) starts `` `phargus` 0.1.1: `` and names `summarize`, `compare`, `10,000` and
  `routesFolded`.

## Risks & open questions

- **Test file location differs from the SPEC's wording (flag for `/pharn-grill`).** The SPEC Scope puts the unit
  tests in `src/phargus/test/summary-routes.test.mjs`, which already exists. `/pharn-plan`'s trusted contract says to
  map only NEW test files: `/pharn-test` would rewrite an existing mapped file, and `/pharn-regress` would then treat
  it as this feature's own and drop it from the regression comparison. So AC-1 to AC-5 go to a new sibling file in
  `src/phargus/test/`, and `summary-routes.test.mjs` keeps its four tests unchanged. The tested behaviour and the
  folder are as specified. Only the file name differs.
- **No existing test encodes the old shape.** A grep this run found no test that deep-compares a whole `requests`
  object or a whole summary. Tests assert `routes`, `distinctRoutes`, `inPeriod`, `period` and metrics field by
  field. So no existing test should need an in-place edit, and none is in the build's scope. If an existing test
  fails after the change, the build stops and reports it. Widening scope to edit tests is not the build's call.
- **Long route strings are still kept for tracked routes.** Up to 10,000 method and path pairs stay in memory, and a
  path can be up to the 1 MiB line limit. Shortening them is S4.5 and out of scope. This increment only puts route
  resolution in one function (`routeIndex().id`).
- **The 5,000,000-span check at 512 MB is advisory and manual** (SPEC Success Metrics). Estimate: four number arrays
  of about 160 MB, plus the selected `durations` and per-route durations (about 80 MB), plus `percentile`'s sorted
  copy. This has not been measured. AC-6 and AC-7 are the committed, scaled-down form.
- **AC-6 and AC-7 generate about 50 MB of NDJSON** inside the test. It should be written in chunks to a temp
  directory, not built as one string (the test runs at the default heap), and removed afterwards. The CLI child runs
  with `--max-old-space-size=64`. Paths resolve from `import.meta.url`, because the root `test` gate runs from the
  repository root.
- **Test runner reach.** The root `package.json` `test` gate does not glob `src/phargus/test/` (SPEC Assumptions).
  The `/pharn-test` preflight decides whether PHARN can run these files per test. AC-8 spawns
  `npm run check:generated` in `src/phargus`, which needs `src/phargus/node_modules` (prettier, yaml).
- **`npm run test:integration` needs `npm run prepare:integration`**, which needs the upstream phargus source
  (`--source`, in CI `.cache/phargus-source`). If it is unavailable locally, the build reports that it did not run,
  rather than claiming it passed.
- **The behavioral fingerprint changes.** Runtime and knowledge files feed `check:evals`'s fingerprint, so
  `releaseReady` reads false until the evals are re-reviewed. Releasing is out of scope, and `check:evals` is not
  among the SPEC's required checks.
