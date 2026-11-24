---
spec_id: phargus-bounded-recording-text
spec_content_hash: be35cbde0632a42d8941bad28a62aa76c344fae3deaa8b98f0759a822a2733ca
applied_lessons: none
---

## Approach

ADVISORY (model work). This plan comes from the Approved SPEC, which `check-spec-approved.mjs` gated GREEN this run.
Every line reference below was read this run.

**One shared cutter.** `src/phargus/runtime/records.mjs` already holds the small helpers both `summary.mjs` and
`upstream.mjs` import (`object`, `integer`). It gains:

```js
/** Longest recording or project text a helper prints; a longer value is cut and ends with '…'. */
export const TEXT_LIMIT = 200;
/** @param {string} value */
export function shorten(value) {
  return value.length > TEXT_LIMIT ? value.slice(0, TEXT_LIMIT) + '…' : value;
}
```

`length` is UTF-16 code units, as the SPEC assumes, so a cut value is 201 code units at most. The existing private
`positiveInteger` (records.mjs:206) gets the `export` keyword, so `doctor` can reuse it. Nothing in `parseRecord`,
`quality()`, `fileEvents` or `qualityTracker` changes. The stored recording, `capture` and the record validation stay
as they are (SPEC non-goals).

**`summarize` (`src/phargus/runtime/summary.mjs`).**

1. **A counting cut.** At the top of `summarizeEvents`, `let shortenedValues = 0;` and a local
   `cut(value)`, which calls `shorten(value)` and adds 1 when the result differs from the input. A cut string always
   differs from its input, and an uncut one is returned unchanged, so the comparison is exact.
2. **The route key (S4.1's single function).** `routeIndex(cut)` receives the cutter. At the start of `id(method,
   path)`, and before the key is formed:
   - `method` becomes `OTHER_ROUTE` when it does not match `/^[A-Za-z-]{1,32}$/`. `M-SEARCH` matches. A method over
     32 characters fails the pattern, so it is replaced, never cut, and not counted (SPEC Assumptions). No method
     therefore ever needs cutting.
   - `path` becomes `cut(path)`.

   The rest of `id` is unchanged. Two paths that share their first 200 characters get the same key and the same id,
   so they are grouped as one route (AC-2). `id` runs once per span, inside the runtime period or not, so the counter
   counts each cut span (SPEC Assumptions). A span with method `(other)` gets an ordinary tracked id whose name is
   `{ method: '(other)', path: <its cut path> }`. The overflow id `TRACKED_ROUTE_LIMIT`, and `routeBreakdown`'s mapping
   of it to `(other)`/`(other)`, are untouched, so the overflow route stays a separate route.
3. **Hotspots.** In the sample branch (summary.mjs:140-148), each hotspot entry's site is cut once with
   `const site = cut(entry.site)`. That value is both the `sites` map key and the stored `site`, so hotspots are
   grouped by the cut site, one count per entry per sample.
4. **Memory.** Lines 138-139 copy `{ ...record.data.memory }`. Replace that with a copy of only the keys in a
   module constant `MEMORY_KEYS = new Set(['heapUsed', 'heapTotal', 'rss', 'external', 'arrayBuffers'])`:
   `Object.fromEntries(Object.entries(record.data.memory).filter(([key]) => MEMORY_KEYS.has(key)))`. This keeps the
   recording's own key order, so a record that holds only these five keys serializes byte for byte as today.
   `parseRecord` guarantees all five are integers. The window branch (`heapUsed`, `rss`) is unchanged (SPEC
   Assumptions).
5. **The counter in the result.** `quality: status` becomes `quality: { ...status, shortenedValues }`, so the new
   key comes last in `quality`. The copy is made when the function returns, after every record has been read, so it
   holds `fileEvents`' final counts. `summarizeFile` then edits `result.quality` exactly as now and adds nothing to
   `shortenedValues` from a manifest (SPEC Assumptions). `evidenceProblems` and `compareSummaries` do not read the new
   key, so it is not an evidence problem and does not change `comparable`. `compare` embeds both summaries, so each
   side carries its own counter. `schemaVersion` stays `1`, and no field is renamed or removed.

**`doctor` (`src/phargus/runtime/upstream.mjs:111-157`).**

- `application.type` is `'module'` when `application.type === 'module'`, and `'commonjs'` otherwise. That is how
  Node.js itself treats the field (SPEC Assumptions).
- `application.scriptNames` is `Object.keys(application.scripts).map(shorten)`.
- `config`, when `phargus.config.json` parses to an object, is built key by key in today's order: `output` only
  when it is a string, then cut with `shorten`; `intervalMs` and `queueBound` only when `positiveInteger`; `enabled`
  only when it is a boolean. A key that fails its check is left out, as an absent key is today.
- When reading `phargus.config.json` fails with `ENOENT`, check whether `phargus.config.js` exists in the project
  root with `access` from `node:fs/promises`. Never read it and never import it. If it exists, `config` is
  `{ file: 'phargus.config.js', read: false }`. If not, `config` stays `null`. A present `phargus.config.json` is read
  as today, whether or not the `.js` file also exists, and any other read or parse error is still thrown.
- `doctor` gets no counter (SPEC Assumptions).

**Types and docs.** In `src/phargus/runtime/types.d.ts`, `Summary['quality']` becomes
`Quality & { shortenedValues: number }`, with a one-line comment that it counts values cut to 200 characters in this
summary and is not an evidence problem. `Quality` itself does not change: capture manifests use it and carry no
counter. In `src/phargus/knowledge/data.md`, a few new lines are added right after line 32, at the end of the routes
paragraph. Existing lines are not re-wrapped, so `route-cap-docs.test.mjs` still finds its one-line phrases:

> A span's path, and a backpressure hotspot's site, longer than the 200-character limit is cut to its first 200
> characters followed by …, before routes and hotspots are grouped. A method that is not 1 to 32 letters or hyphens
> is reported as (other) and keeps its own path. quality.shortenedValues counts every cut value; it is not an
> evidence problem and does not change comparable. From raw samples, memory.first and memory.last keep only heapUsed,
> heapTotal, rss, external and arrayBuffers.

Wrap it at the file's width of about 90 columns.

**The existing test that encodes the old quality shape.** A grep this run found exactly one assertion over a whole
quality object. It is `EXPECTED_0_1_1` in `src/phargus/test/summary-route-cap.test.mjs` (line 148), compared in the
AC-4 test (lines 150-155). That literal is real phargus 0.1.1 output, so it stays as it is. The test is edited in
place: it takes `shortenedValues` out of `result.quality` the same way it takes `routesFolded` out of `requests`. It
asserts `shortenedValues === 0` and compares `JSON.stringify({ ...result, requests, quality })` with the unchanged
literal. Nothing in that file is deleted. The fixture's memory keys come in the five-key order, so `memory` still
matches byte for byte. No other existing test deep-compares a whole quality, summary or `config` object. The
`config` deep-equal in `upstream.test.mjs:99` (`{ output: 'none', intervalMs: 250, enabled: true }`) still holds
after the change.

**Generated copies.** `generate.mjs` copies every runtime file into each of the five skills' `scripts/`, and
`data.md` into each skill's `references/`, then formats them with prettier. All 25 affected copies were
byte-identical to their sources this run (`cmp`). The build writes each copy with the Write tool, byte-identical to
its updated source, and confirms with `npm run check:generated`. It does not run `npm run build`, because that
rewrites every generated file, and most of those are outside this plan's writes-scope (the PHARN stage rule allows a
generator only when every path it writes is in scope). The outcome the SPEC asks for, copies regenerated to match,
is what `check:generated` verifies.

## Applied lessons

- none: `check-lessons-index.mjs --verdict` printed `NO_CANON` this run. The project has no
  `pharn/memory-bank/lessons-learned.md` with promoted lessons, so there was nothing to apply.

## Steps

- `src/phargus/runtime/records.mjs`: add `TEXT_LIMIT` and `shorten` (Approach), and export `positiveInteger`.
  Change nothing else.
- `src/phargus/runtime/summary.mjs`: import `shorten`. Add `MEMORY_KEYS`, the method pattern, the counting `cut`,
  and the `routeIndex(cut)` change. Then the hotspot cut, the memory copy, and `quality: { ...status,
  shortenedValues }` (Approach 1-5). Leave `routeBreakdown`, the selection pass, `percentile`, `summarizeFile`,
  `evidenceProblems`, `coverageProblems` and `compareSummaries` as they are.
- `src/phargus/runtime/upstream.mjs`: import `shorten` and `positiveInteger`, and add `access` to the
  `node:fs/promises` import. Then the `doctor` changes (Approach).
- `src/phargus/runtime/types.d.ts`: `Summary['quality']` becomes `Quality & { shortenedValues: number }`.
- `src/phargus/knowledge/data.md`: add the new lines after line 32.
- `src/phargus/test/summary-route-cap.test.mjs`: the in-place AC-4 edit (Approach).
- Write the 25 generated copies (`## Files`), each byte-identical to its source.
- From `src/phargus`, run each of these and require it to pass (SPEC Constraints): `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration` (after `npm run prepare:integration`,
  see Risks), `npm run check:generated`, `npm run check:skills` and `npm run check:package`.
- `/pharn-test` writes the AC tests before the build, into the two new files that `AC-TESTS.md` names. The build
  never edits them.

## Files

- `src/phargus/runtime/records.mjs` — `TEXT_LIMIT` and `shorten` added, `positiveInteger` exported; validation unchanged
- `src/phargus/runtime/summary.mjs` — method pattern and path cut in `routeIndex().id`, hotspot site cut, five-key memory copy, `quality.shortenedValues`
- `src/phargus/runtime/upstream.mjs` — `doctor`: `type` only module/commonjs, script names and `output` cut, typed config keys, `phargus.config.js` reported unread
- `src/phargus/runtime/types.d.ts` — `Summary['quality']` is `Quality & { shortenedValues: number }`
- `src/phargus/knowledge/data.md` — the 200-character limit, `(other)` methods, `quality.shortenedValues`, the five memory keys
- `src/phargus/test/summary-route-cap.test.mjs` — AC-4 test edited in place: `shortenedValues` taken out of `quality`, asserted `0`, literal unchanged
- `plugins/phargus/skills/phargus-setup/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-setup/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-setup/scripts/upstream.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-setup/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-setup/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/scripts/upstream.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-diagnose/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-verify/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-verify/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-verify/scripts/upstream.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-verify/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-verify/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-memory/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-memory/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-memory/scripts/upstream.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-memory/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-memory/references/data.md` — generated copy of the knowledge file, byte-identical
- `plugins/phargus/skills/phargus-rules/scripts/records.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-rules/scripts/summary.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-rules/scripts/upstream.mjs` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-rules/scripts/types.d.ts` — generated copy of the runtime file, byte-identical
- `plugins/phargus/skills/phargus-rules/references/data.md` — generated copy of the knowledge file, byte-identical

### Explicitly not touched

- `src/phargus/test/summary-regressions.test.mjs` — existing tests kept as they are; see Risks (test file location)
- `src/phargus/test/upstream.test.mjs` — existing tests kept as they are; its `config` deep-equal still holds
- `src/phargus/runtime/capture.mjs` — `capture` is out of scope
- `src/phargus/runtime/phargus.mjs` — the CLI passes results through unchanged
- `src/phargus/runtime/operations.mjs` — not involved
- `src/phargus/knowledge/tools.md` — the SPEC asks only `data.md` to describe the change
- `src/phargus/scripts/generate.mjs` — reused through `check:generated`, never edited
- `src/phargus/package.json` — no script or dependency change
- `src/phargus/VERIFICATION.json` — release evidence; no release in this increment
- `CHANGELOG.md` — the SPEC does not ask for an entry; see Risks

## Acceptance mapping

The AC tests go in two new files, named in `AC-TESTS.md`: one unit file for AC-1 and AC-2, and one for AC-3.

- AC-1 → `routeIndex(cut).id` cuts the 10,000-character path to 200 characters plus `…`. It replaces the
  300-character method and `NOT A METHOD!` with `(other)`, and each of those spans keeps its own cut path. `M-SEARCH`
  passes the pattern and keeps its route. The six 10,000-character hotspot sites are cut before grouping and become
  one hotspot. `memory.first` and `memory.last` copy only the five keys, so the 80 KB of extra memory text is gone.
  `shortenedValues` counts each cut path and each cut site entry (the test counts the same values), and replaced
  methods are not counted. What remains is a few routes and one hotspot of at most 201 characters each, far under
  20,000 bytes.
- AC-2 → both 300-character `GET` paths cut to the same 201-character key, so `id` returns one id and the route
  has count `2`. Each span is cut once, so `shortenedValues` is `2`. The existing fixtures hold no string over 200
  characters, and their memory objects have exactly the five keys. So every value the existing tests assert is
  unchanged, and `shortenedValues` is `0` on every summary, including both sides of `compare`. The existing suites,
  which `/pharn-regress` compares, still pass, with the one AC-4 edit above.
- AC-3 → `type` is `'commonjs'` for any value other than `'module'`. The 300-character script name goes through
  `shorten`. The 300-character `output` is a string, so it is cut. The sentence values of `intervalMs`,
  `queueBound` and `enabled` fail `positiveInteger` or the boolean check and are left out. With only
  `phargus.config.js` present, the JSON read fails with `ENOENT`, `access` finds the `.js` file, and `config` is
  `{ file: 'phargus.config.js', read: false }`.

## Risks & open questions

- **The test files differ from the SPEC's wording (flag for `/pharn-grill`).** The SPEC Scope puts the tests in
  `src/phargus/test/summary-regressions.test.mjs` and `src/phargus/test/upstream.test.mjs`, which already exist.
  `/pharn-plan`'s trusted contract says to map only NEW test files (`pharn/pharn-contracts/ac-tests.md`, "A mapped
  test file is assumed NEW"): `/pharn-test` would rewrite an existing mapped file, and `/pharn-regress` would then
  treat it as this feature's own and leave its existing tests out of the regression comparison. So the AC tests go to
  two new sibling files in `src/phargus/test/`, and the two named files keep their tests unchanged. CORE-234 settled
  the same mismatch the same way. The tested behaviour and the folder are as specified. Only the file names differ.
- **The edited AC-4 test belongs to CORE-234.** `summary-route-cap.test.mjs` is that feature's AC test file, pinned
  by its `AC-TESTS.lock.json`. The SPEC requires an in-place edit of tests that encode the old quality shape, and
  this is the only one. Re-checking that shipped feature's lock would now read the file as changed. Nothing in this
  run re-checks it.
- **Memory key order.** The five keys keep the recording's own order, so output is byte-identical for today's
  records. A record with extra memory keys loses them from `memory.first` and `memory.last`. That is the intended
  change, and those keys were never read by any metric.
- **A literal `(other)` recorded path with an invalid method** gets a tracked route named `(other)`/`(other)`. That
  route is separate from the overflow route but has the same strings. The same was already true for a literally
  recorded `(other)` pair (CORE-234), and the SPEC keeps the overflow route separate.
- **Test runner reach.** The root `package.json` `test` gate does not glob `src/phargus/test/` (SPEC Assumptions).
  `/pharn-test`'s preflight decides whether PHARN can run these files per test.
- **`npm run test:integration` needs `npm run prepare:integration`**, which needs the upstream phargus source. If
  that source is unavailable locally, the build reports that the integration tests did not run, and does not claim
  they passed.
- **No CHANGELOG entry is planned.** CORE-234 added one under `[Unreleased]`, but this SPEC does not ask for one,
  and planning one would add scope (P7). A person may want a bullet before release.
- **The behavioural fingerprint changes.** Runtime and knowledge files feed `check:evals`'s fingerprint, so
  `releaseReady` reads false until the evals are re-reviewed. Releasing is out of scope, and `check:evals` is not
  among the SPEC's required checks.
