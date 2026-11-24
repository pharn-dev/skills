---
spec_id: phargus-summary-bounded-memory
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

CORE-234 (S4.1). The phargus helpers `summarize --file` and `compare` run out of memory on a large recording. An
agent diagnosing a Node.js service hands them a long capture, and on a 1.1 GB recording of 5,000,000 spans with unique
paths `summarize --file` aborts with a V8 heap out-of-memory crash (exit 134) and prints no JSON at all. `compare`
reads both of its recordings the same way, so it fails the same way.

The cause is in `src/phargus/runtime/summary.mjs`: it keeps every span as an object that holds its raw path string
(lines 75-76 and 153-160), and it builds one group, with its own array of durations, per distinct method and path
(lines 34-62). Request paths carry ids (`/users/123/orders`), so the number of groups grows with the number of
requests. File reads have no event cap (0.1.1, #26), and the comment at `src/phargus/runtime/records.mjs:176-177`
wrongly justifies that with "a file is already bounded and summarizing it is fast".

The person wants both commands to finish with a JSON result on such a recording, without bringing back a default
event cap for file reads, while every whole-recording statistic stays exact. The per-route table may become partial
past a fixed number of routes, but the result must say so, so the agent reading it knows the table is incomplete.

## Scope

**In scope:**

- `summarize` keeps only numbers per span (duration, start time, status code and an integer route id) and keeps no
  span object or path string once a span's route is known.
- A cap of 10,000 tracked routes. Past the cap, spans of new routes are counted in one route whose method and path
  are both `(other)`, and a new boolean field `requests.routesFolded` says the route table is partial.
- Past the cap, `requests.distinctRoutes` counts the tracked routes plus one for `(other)`, and is a lower bound.
- `src/phargus/runtime/types.d.ts` gains `routesFolded`.
- `src/phargus/knowledge/data.md` (lines 26-28) and `src/phargus/knowledge/tools.md` (lines 62-64) state the cap,
  the flag, and that `distinctRoutes` is a lower bound when the flag is set; `npm run build` regenerates their
  copies, and those of the runtime files, under `plugins/phargus`.
- Correcting the comment at `src/phargus/runtime/records.mjs:176-177`.
- Unit tests in `src/phargus/test/summary-routes.test.mjs` and CLI tests under `src/phargus/test/` for the outcomes
  below; existing tests that encode the old behaviour are edited in place.
- A bullet under `[Unreleased]` → `### Fixed` in the root `CHANGELOG.md`.

**Out of scope (non-goals):**

- A default event cap for file reads, or any change to `--max-events`, `capture` or the live SSE limit.
- Shortening long method or path strings (S4.5); this increment only keeps route resolution in one place so S4.5
  can add it there.
- Memory use of other per-recording state: `hotspots` sites, the sample spacing list, `collect` and rule replay.
- Changing which spans count as in the runtime period, the top-20 limit of `requests.routes`, or its ordering.
- Releasing or tagging a new phargus version, and the `pharn` and `pharn-ci` plugins.

## Acceptance Criteria

- **AC-1** Given a recording whose spans all lie inside the runtime period, with 10,001 distinct method and path
  pairs, where the first 10,000 pairs in recording order have one span each and the last pair has two spans When it
  is summarized Then `requests.routesFolded` is `true`, `requests.distinctRoutes` is `10001`, and `requests.routes`
  contains an entry with method `(other)`, path `(other)` and count `2`
  - verify: unit
- **AC-2** Given a recording whose spans all lie inside the runtime period, with either 9,999 or 10,000 distinct
  method and path pairs When it is summarized Then `requests.routesFolded` is `false`, `requests.distinctRoutes`
  equals the number of distinct pairs, and no entry of `requests.routes` has method `(other)`
  - verify: unit
- **AC-3** Given the recording of AC-1 When it is summarized Then `requests.inPeriod`, `counts.spans`,
  `metrics.observedRequestP50Ns`, `metrics.observedRequestP99Ns` and `metrics.observedServerErrors` equal the values
  computed from all of its spans, and the `(other)` entry's `p50Ns`, `p99Ns`, `maxNs` and `serverErrors` equal those
  computed from the spans of the folded pair
  - verify: unit
- **AC-4** Given a recording with 50 distinct method and path pairs and an expected summary committed from the
  current phargus 0.1.1 output before this change When it is summarized Then the result, with
  `requests.routesFolded` removed, serializes to exactly the committed expected JSON, and `requests.routesFolded` is
  `false`
  - verify: unit
- **AC-5** Given every existing test fixture in `src/phargus/test/` When it is summarized or compared Then its
  request counts, `requests.routes`, `requests.distinctRoutes` and request percentiles equal the values the
  existing tests already assert, and each summary carries `requests.routesFolded: false`
  - verify: unit
- **AC-6** Given a recording generated inside the test with 200,000 spans that each have a unique path and lie
  inside the runtime period When `node --max-old-space-size=64 runtime/phargus.mjs summarize --file <recording>` is
  run without `--max-events` Then it exits 0, stdout is one JSON result with `counts.spans` `200000`,
  `quality.truncated` `false` and `requests.routesFolded` `true`
  - verify: integration
- **AC-7** Given two recordings of the AC-6 shape When `node --max-old-space-size=64 runtime/phargus.mjs compare` is
  run with them as `--before` and `--after` Then it exits 0 and stdout is one JSON result with `command` `compare`,
  whose `before.requests.routesFolded` and `after.requests.routesFolded` are both `true`
  - verify: integration
- **AC-8** Given `src/phargus/knowledge/data.md` and `src/phargus/knowledge/tools.md` When they are read Then each
  names the 10,000-route cap, the `(other)` route, the `routesFolded` field, and says that `distinctRoutes` is a
  lower bound when `routesFolded` is `true`, and `npm run check:generated` run from `src/phargus` exits 0
  - verify: unit
- **AC-9** Given the root `CHANGELOG.md` When its `[Unreleased]` → `### Fixed` section is read Then it holds a
  bullet that starts `` `phargus` 0.1.1: `` and names `summarize`, `compare`, the 10,000-route cap and
  `routesFolded`
  - verify: unit

## Constraints

- The person requires that, per span, only numbers are kept once the route is known (duration, start time, status
  code, integer route id), and that turning a method and path into a route id happens in exactly one function, so
  S4.5 can later shorten long method and path strings there.
- No default event cap for file reads comes back; a file is read whole unless `--max-events` is given.
- Whole-recording statistics (counts, all request durations, percentiles, server errors, request rate) stay exact
  past the route cap.
- Existing tests that encode the old behaviour are edited in place, never deleted.
- The summary keeps `schemaVersion: 1`; the new field is added, no existing field is renamed or removed.
- Run from `src/phargus`, these all pass: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:integration` (after `npm run prepare:integration`), `npm run check:generated`,
  `npm run check:skills` and `npm run check:package`.
- Each reproduced scenario is a committed test that asserts the fixed outcome.

## Data

- A span: one observed request, with a method, a path, a start time, a duration and a status code.
- A route: a distinct method and path pair; each in-period span belongs to exactly one route.
- The `(other)` route: one route that stands for every route first seen after 10,000 routes are already tracked.
- The route table: `requests.routes` (top 20 by count) plus `requests.distinctRoutes` and `requests.routesFolded`.

## Assumptions

- The flag is named `requests.routesFolded`, placed right after `requests.distinctRoutes`; the description left the
  name to `knowledge/data.md`, and this SPEC fixes it so the tests can assert it.
- The 10,000 tracked routes are the first 10,000 distinct method and path pairs in recording order; a route first
  seen in a span outside the runtime period still takes one of the 10,000 places.
- `requests.routesFolded` is `true` exactly when at least one in-period span was counted in `(other)`, so the flag
  and the `(other)` row agree; spans outside the runtime period never appear in the route table, as today.
- Past the cap, `requests.distinctRoutes` counts the tracked routes that have at least one in-period span, plus one
  for `(other)`, keeping today's meaning of counting only selected spans.
- A recorded span whose method and path are both literally `(other)` gets no special handling.
- The `(other)` entry is ordered in `requests.routes` like any other route (count, then p99Ns, then method and
  path), so it is listed only when it is among the top 20.
- The 1.1 GB, 5,000,000-span checks at `--max-old-space-size=512` are manual (Success Metrics); AC-6 and AC-7 are the
  committed, scaled-down form of the same failure, and today's code is expected to fail them with exit 134.
- AC-7 was added beyond the description's tests because the description names `compare` as failing the same way;
  the same generated file may serve as both recordings.
- The root `package.json` `test` script does not run `src/phargus/test/`; these criteria's tests run through
  `src/phargus`'s own `npm test` and `npm run test:integration`, and the test stage's preflight decides whether
  PHARN can run them per test.
- AC-6 and AC-7 run the CLI as a child process, which is how existing tests such as
  `src/phargus/test/event-limits.test.mjs` already test it, so `integration` is their level even though they may live
  in a file `npm test` runs.
- AC-9's bullet follows the existing `` `phargus` 0.1.1: `` bullets in `[Unreleased]` → `### Fixed`, not a new
  version number, as the description asks.

## Success Metrics

- `node --max-old-space-size=512 phargus.mjs summarize --file <a 1.1 GB recording of 5,000,000 unique-path spans>`
  exits 0 with a JSON result (manual check).
- `compare` on two such recordings exits 0 with a JSON result (manual check).
