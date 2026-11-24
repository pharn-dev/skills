---
spec_id: phargus-bounded-recording-text
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
spec_kind: quick
---

## Intent

CORE-238 (S4.5). The phargus helpers `summarize` and `doctor` print text taken from a recording or from the
user's project without bounding or validating it, so a small crafted input makes them print a large amount of
attacker-influenced text into the agent's context.

In `src/phargus/runtime/summary.mjs`, `summarize` copies every key of a sample's memory object into
`memory.first` and `memory.last`, copies backpressure hotspot `site` strings at full length (also as the key the
hotspots are grouped by), and uses a span's `method` and `path` at full length as the route key.
`src/phargus/runtime/records.mjs` only checks that these values are strings, so a recording of six samples yields
about 500 KB of such text. `doctor` (`src/phargus/runtime/upstream.mjs`) echoes `application.type`, the script
names, and `output`, `intervalMs`, `queueBound` and `enabled` from `package.json` and `phargus.config.json` with no
type check, and answers `config: null` when only `phargus.config.js` exists, as if there were no config.

The person wants both commands to print only bounded, validated text, while every existing result stays the same
apart from one new zero counter.

## Scope

**In scope:**

- `summarize` (and `compare`, which reports two summaries): `memory.first` and `memory.last` copy only
  `heapUsed`, `heapTotal`, `rss`, `external` and `arrayBuffers`.
- A span's `path` and `method`, and a hotspot's `site`, longer than 200 characters are cut to their first 200
  characters followed by `…`. The cut happens in S4.1's single route-key function (`routeIndex().id`), so the cut
  key is what spans are grouped by, and before the hotspot grouping key is formed.
- A method that does not match `^[A-Za-z-]{1,32}$` is reported as `(other)`; the span keeps its own (cut) path.
  `M-SEARCH` matches. S4.1's overflow route (method `(other)`, path `(other)`) stays a separate route.
- A new integer field `quality.shortenedValues` counts every cut value; it is not an evidence problem and does not
  change `comparable`. `src/phargus/runtime/types.d.ts` and `src/phargus/knowledge/data.md` describe it, and
  `knowledge/data.md` names the 200-character limit.
- `doctor`: `application.type` is only `module` or `commonjs`; `config.output` only a string, cut;
  `config.intervalMs` and `config.queueBound` only positive integers; `config.enabled` only a boolean; script names
  cut; with only `phargus.config.js` present, `config` says the file exists and was not read.
- `npm run build` regenerates the copies under `plugins/phargus`.
- Tests in `src/phargus/test/summary-regressions.test.mjs` and `src/phargus/test/upstream.test.mjs`; existing
  tests that assert whole quality objects are edited in place for the new zero counter.

**Out of scope (non-goals):**

- Changing the stored recording, `capture`, or the record validation in `records.mjs`.
- Reading or executing `phargus.config.js` (or any other config file than `phargus.config.json`).
- A cap on the number of script names, hotspots, routes or samples (S4.1's route cap stays as it is).
- Releasing or tagging a new phargus version, and the `pharn` and `pharn-ci` plugins.

## Acceptance Criteria

- **AC-1** Given a recording of six samples, each with a memory object carrying extra keys that hold about 80 KB of
  text besides the five numeric keys and a backpressure hotspot whose `site` is 10,000 characters long, plus spans
  inside the runtime period with a 10,000-character path, a 300-character method, the method `NOT A METHOD!` and
  the method `M-SEARCH` When it is summarized Then the result serialized as JSON is under 20,000 bytes;
  `memory.first` and `memory.last` each have exactly the keys `heapUsed`, `heapTotal`, `rss`, `external` and
  `arrayBuffers`; every `method` and `path` in `requests.routes` and every `site` in `hotspots` is at most 201
  characters long, and each value longer than 200 characters in the recording appears as its first 200 characters
  followed by `…`; no route has the method `NOT A METHOD!` or the 300-character method, and their spans appear under
  method `(other)` with their own cut path; a route has the method `M-SEARCH`; and `quality.shortenedValues` equals
  the number of values that were cut
  - verify: unit
- **AC-2** Given a recording whose spans lie inside the runtime period, with two `GET` spans whose paths are 300
  characters long and differ only after character 200 When it is summarized Then `requests.routes` holds one entry
  for them with count `2` and a path of the shared first 200 characters followed by `…`, and
  `quality.shortenedValues` is `2`; and given every existing summary fixture in `src/phargus/test/` When it is
  summarized or compared Then each summary's `quality.shortenedValues` is `0` and every other value equals what the
  existing tests already assert
  - verify: unit
- **AC-3** Given a project whose `package.json` holds a sentence as `type` and a script whose name is 300 characters
  long, and whose `phargus.config.json` holds a 300-character `output` and sentences as `intervalMs`, `queueBound`
  and `enabled` When `doctor` runs on it Then `application.type` is `commonjs`, the script name is reported as its
  first 200 characters followed by `…`, and `config` has none of the keys `intervalMs`, `queueBound` or `enabled`
  and an `output` of the first 200 characters followed by `…`; and given a project with only `phargus.config.js`
  When `doctor` runs on it Then `config` is `{ "file": "phargus.config.js", "read": false }`
  - verify: unit

## Constraints

- The limit is 200 characters, the marker is the single character `…`, so no cut value is longer than 201
  characters.
- The cut happens inside the one function that turns a method and path into a route id (S4.1), so grouping uses
  the cut key; hotspots are grouped by the cut site.
- `quality.shortenedValues` is an integer, is not an evidence problem, and does not change `comparable`.
- The summary keeps `schemaVersion: 1`; the new field is added, no existing field is renamed or removed.
- Existing tests that encode the old quality shape are edited in place, never deleted.
- Run from `src/phargus`, these all pass: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:integration` (after `npm run prepare:integration`), `npm run check:generated`,
  `npm run check:skills` and `npm run check:package`.

## Assumptions

- A string's length is its JavaScript `length` (UTF-16 code units), so a cut value is the first 200 code units plus
  `…`.
- `quality.shortenedValues` counts one per cut occurrence (each span, each hotspot entry of each sample), whether or
  not the span lies inside the runtime period; a method replaced by `(other)` is not counted as cut.
- A method longer than 32 characters fails the method pattern, so it is replaced by `(other)` rather than cut.
- `summarizeFile` does not add a `shortenedValues` value from a capture manifest; the counter covers only values cut
  in this run.
- Summaries built from aggregated windows keep today's `memory.first` and `memory.last` keys (`heapUsed`, `rss`).
- `doctor` reports any `type` other than `module` as `commonjs`, which is how Node.js itself treats the field; an
  invalid `output`, `intervalMs`, `queueBound` or `enabled` value is left out of `config`, as an absent key is today.
- When both `phargus.config.json` and `phargus.config.js` exist, `phargus.config.json` is read as today; the
  `{ "file": "phargus.config.js", "read": false }` shape answers only the case where the JSON file is absent.
- `doctor` carries no shortened-values counter; the description names the counter for `summarize` only.
- "Under 20 KB" is read as under 20,000 bytes of serialized JSON, which satisfies either reading of KB.
- `knowledge/data.md` naming the limit, and the regenerated copies, are checked by review and by
  `npm run check:generated`, not by a criterion of their own, because a quick SPEC has at most three criteria.
- The root `package.json` `test` script does not run `src/phargus/test/`; these criteria's tests run through
  `src/phargus`'s own `npm test`, and the test stage's preflight decides whether PHARN can run them per test.
