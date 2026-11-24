---
spec_id: phargus-ordinary-input-problems
spec_content_hash: ac994bc568f1cd8a9d9fdbc77fe31cc8874722c72cc7b48789d8e37ad0bea8c8
applied_lessons: none
---

## Approach

ADVISORY (model work). Fix five input problems in the Phargus helpers with the smallest change at the one place each
problem enters: the shared line reader, `classifyLine`, the manifest gate in `summarizeFile`, the capture `finally`
block and the CLI's error print. No new module, no new export besides what callers already import, no version bump.

1. **Line reader (`lines` in `runtime/records.mjs`).** It yields `string | null`. `null` stands for one line over
   1 MiB that was skipped. While a line is still open and `pending` grows past 1 MiB, the reader drops `pending` and
   sets a `skipping` flag, so memory stays bounded at about 1 MiB plus one chunk. At the next `\n` it yields `null` once
   and clears the flag. A complete line over 1 MiB found in one chunk also yields `null`. At end of input, an open
   skipped line yields `null` too. The cap stays 1 MiB (one `LINE_LIMIT` constant in place of the two literals). On the
   first non-empty decoded text it drops one leading U+FEFF (`pending.replace(/^\uFEFF/, '')`, run once). This
   handles a BOM split across chunks, because `StringDecoder` returns `''` until the 3 bytes are complete. Sketch:

   ```js
   const LINE_LIMIT = 1024 * 1024;
   /** Yields each line, or null for a line over 1 MiB, which is skipped. @param {AsyncIterable<Buffer | string>} input @returns {AsyncGenerator<string | null>} */
   export async function* lines(input) {
     const decoder = new StringDecoder('utf8');
     let pending = '';
     let started = false;
     let skipping = false;
     for await (const chunk of input) {
       pending += typeof chunk === 'string' ? chunk : decoder.write(chunk);
       if (!started && pending) {
         started = true;
         pending = pending.replace(/^\uFEFF/, '');
       }
       let end;
       while ((end = pending.indexOf('\n')) !== -1) {
         const line = pending.slice(0, end).replace(/\r$/, '');
         pending = pending.slice(end + 1);
         if (skipping) {
           skipping = false;
           yield null;
         } else yield Buffer.byteLength(line) > LINE_LIMIT ? null : line;
       }
       if (Buffer.byteLength(pending) > LINE_LIMIT) {
         skipping = true;
         pending = '';
       }
     }
     pending += decoder.end();
     if (skipping) yield null;
     else if (pending.trim()) yield Buffer.byteLength(pending) > LINE_LIMIT ? null : pending.replace(/\r$/, '');
   }
   ```

2. **Callers count the skipped line as one invalid record.** `classifyLine(line)` accepts `string | null` and returns
   `{ kind: 'invalid' }` for `null`. That one branch covers `fileEvents` (summarize, compare, `capture --file`,
   file-mode `collect`, `rules`) and `following` (`collect --follow`). Both already route `invalid` to
   `status.invalidRecords`, and `following` then throws its existing "invalid NDJSON record while collecting", as the
   SPEC's assumption requires. So `runtime/operations.mjs` needs no edit. **SSE** (`sseEvents` in `runtime/capture.mjs`)
   has its own loop. On `null` it adds 1 to `manifest.quality.invalidRecords`, resets `event` and `data`, and sets a
   `discard` flag. While `discard` is set it ignores every line up to and including the next blank line, so the message
   the long line belonged to is never counted a second time. The 64 MiB response cap is unchanged.

3. **`classifyLine` field rule.** When a parsed line is not a valid record, it counts as `invalid` only when it is an
   object that carries a Phargus field with the right type: a numeric `timestamp`, an object `eventLoop`, `type`
   `"span"`, a numeric `start`, a string `ruleId`, or an `event` in `['sample', 'window', 'span', 'alert']` with an
   object `data`. Anything else is a `log`. The `phargusKeys` key-name list goes away. The unparseable-JSON branch keeps
   today's text test for recognizable truncated Phargus JSON, unchanged. Without `--allow-logs`, `fileEvents` already
   counts `log` and `invalid` alike as invalid records. That rule is untouched, so the SPEC constraint holds.

4. **Manifest counters (`summarizeFile` in `runtime/summary.mjs`).** The existing refusal condition also refuses a
   manifest whose `quality.invalidRecords` or `quality.ignoredLogs` is not `integer(...)`, the predicate
   `runtime/records.mjs` already exports (a safe integer at or above 0). The message stays exactly
   `unsupported capture manifest`. The check runs before any event is read, so no summary is returned. `compare` calls
   `summarizeFile` for each side, so `--before-manifest` and `--after-manifest` are covered by the same line. The counters
   are then added without the `?? 0` fallback (a `Number(...)` cast is kept only if `tsc` needs it for narrowing).

5. **Capture failure path (`capture` in `runtime/capture.mjs`).** The `finally` block becomes one plain branch. If
   `failure` is set and `manifest.events === 0`, it closes both handles and unlinks `eventsPath` and `manifestPath`,
   the two files this call reserved with `wx`. Otherwise it writes the manifest as today. This covers HTTP errors,
   refused connections, unknown hosts, redirects, the wrong content type, heartbeat-only and interrupted captures with
   zero events, and `capture --file` with no valid event. A capture that wrote at least one event keeps both files and
   its `termination`. The reservation code above it is untouched, so a pre-existing `manifest.json` or
   `events.ndjson` is never removed (`test/capture.test.mjs:166`). The branch is the single place a later SIGTERM change
   extends.

6. **Fetch cause in the error message (`runtime/phargus.mjs`).** The top-level `.catch` builds `error.message` with a
   small local helper. When `error.cause` is an object, it appends `': '` plus `cause.code` if that is a non-empty
   string, else `cause.message` if that is a non-empty string. Node's `fetch` then prints `fetch failed: ECONNREFUSED`,
   `fetch failed: ENOTFOUND` and `fetch failed: unexpected redirect`. Errors without a cause print as today. The
   separator is `': '`.

7. **Docs and changelog.** Rewrite `src/phargus/knowledge/tools.md` lines 28-37 (wording below), regenerate
   `plugins/phargus` with `npm run build` from `src/phargus`, and add one bullet under `CHANGELOG.md`
   `[Unreleased]` `### Fixed`.

**Tests, two kinds.** `/pharn-test` writes the acceptance tests before the build, in new
`.github/scripts/ac-phargus-input-*.test.mjs` files (mapped in `AC-TESTS.md`). Only those run in the root `npm test`
gate the PHARN red run and AC gate read, and the root suite does not run `src/phargus/test`. CONTRIBUTING ("No `ac-*`
test files are merged") requires those files to be folded into permanent tests or dropped before the PR merges. The
build writes the permanent tests the SPEC's Constraints name, in `src/phargus/test/data.test.mjs`,
`test/summary-regressions.test.mjs` and `test/capture.test.mjs`, and rewrites the test at `test/capture.test.mjs:79` in
place. These are the fold destinations.

## Applied lessons

- none: `node pharn/floor/check-lessons-index.mjs . --verdict` printed `NO_CANON` this run. The project has no
  `pharn/memory-bank/lessons-learned.md` with promoted lessons, so there was nothing to read or apply.

## Steps

- **records.mjs:** replace `lines` as in Approach 1. Add the `null` branch to `classifyLine` and the field rule from
  Approach 3, with the JSDoc `@param {string | null} line`. Delete `phargusKeys`.
- **capture.mjs:** add the `null` / `discard` handling to the `sseEvents` line loop (Approach 2). Replace the
  `finally` body of `capture` with the remove-or-write branch (Approach 5). Keep the comment short:
  `// Nothing was measured: remove both files reserved above so a retry into --out is not refused.`
- **summary.mjs:** import `integer` (and `at` if used) from `./records.mjs` and extend the refusal (Approach 4).
- **phargus.mjs:** add the cause helper and use it in the `.catch` print (Approach 6).
- **Permanent unit tests** (node:test, tmp directories via `mkdtemp`, fixtures from `test/fixtures.mjs`, CLI through
  `execFileSync`/`spawnSync(process.execPath, [cli, ...])` as `test/event-limits.test.mjs` does):
  - `test/data.test.mjs`: a BOM-prefixed recording of 6 samples (AC-1). A recording with samples on both sides of a
    line over 1 MiB, through `summarizeFile` and through the CLI `summarize` exit 0 (AC-2). Winston, pino and
    `{"type":"http"}` lines with `allowLogs` (AC-4). A truncated sample line and `{"timestamp":10}` with `allowLogs`
    (AC-5). The AC-4 recording without `allowLogs` (AC-6). Add these as new tests and leave the existing
    `reports corrupt data …` test at line 83 as it is.
  - `test/summary-regressions.test.mjs`: manifests whose counters are missing, `null`, a string, negative or 1.5 are
    refused by `summarizeFile` and by both `compare` manifest flags with `unsupported capture manifest`, and a manifest
    with integer counters is accepted and added (AC-7).
  - `test/capture.test.mjs`: an SSE window, a line over 1 MiB with a blank line, then a second window gives `events`
    2 and `invalidRecords` 1 (AC-3). Rewrite the line-79 test **in place** (same position, retitled
    `fails on authentication errors and removes both reserved files`): it rejects `/HTTP 401/`, `--out` holds neither
    file, and a second capture into the same `--out` from a server sending a valid window succeeds (AC-8). The CLI
    `capture --url` on a closed high port (listen on port 0, read the port, close the server) and on a 302 endpoint:
    nonzero exit, stderr `error.message` contains `ECONNREFUSED` / `unexpected redirect`, and neither file is left
    (AC-9). `capture --file` with no valid event: the rejection names `capture contains no valid Phargus events` and
    neither file is left (AC-10). No existing test is deleted.
- **tools.md:** replace lines 28-37 with this text (wrapped at the file's width; the sentences are what AC-11's test
  reads):

  > Capture reserves events.ndjson and manifest.json in --out, without overwriting prior measurements. A capture that
  > wrote no event removes both files it created and names the cause of the failure (for example HTTP 401,
  > ECONNREFUSED or unexpected redirect), so a retry into the same --out is not refused. File reads by capture --file,
  > summarize and compare have no event-count cap unless --max-events is given. Live capture stops at 30 seconds or
  > 10,000 events by default; for a high-rate service pass a larger --max-events or a shorter --duration-ms.
  > Truncation is reported, and a truncated capture makes compare inconclusive. A UTF-8 byte order mark at the start
  > of a file is ignored. Lines have a 1 MiB cap: a longer line counts as one invalid record and reading continues.
  > SSE responses have a 64 MiB cap. --allow-logs allows unrelated log lines, JSON application logs included, while
  > continuing to report malformed Phargus records, including recognizable truncated Phargus JSON. With --allow-logs
  > a JSON object counts as a Phargus record only when it carries a numeric timestamp, an object eventLoop, type
  > "span", a numeric start, a string ruleId, or one of the four event kinds with an object data. summarize and
  > compare refuse a capture manifest whose quality.invalidRecords or quality.ignoredLogs is not a non-negative
  > integer. Collection fails on corrupt data in both file and --follow modes. Invalid records are not zeros. rules
  > buffers its input, so replay keeps a 10,000-event default that rules --max-events raises.

- **Regenerate:** from `src/phargus` run `npm run build`. It rewrites every path listed under `plugins/phargus` below:
  the copies of the four changed helpers and of `tools.md` change, and the rest are rewritten byte-identical. Then run
  `npm run check:generated`.
- **Format:** from `src/phargus`, run Prettier on the changed source and test files only, named one by one:
  `npx prettier --write --config .prettierrc.json runtime/records.mjs runtime/capture.mjs runtime/summary.mjs runtime/phargus.mjs knowledge/tools.md test/data.test.mjs test/summary-regressions.test.mjs test/capture.test.mjs`.
  Never run `npm run format`, which formats whole directories. The generator formats its own outputs.
- **CHANGELOG.md:** add, after the last `` `phargus` 0.1.1: `` bullet of `[Unreleased]` `### Fixed`, one bullet in the
  file's style starting `` - `phargus` 0.1.1: ``. It covers the BOM, the over-1 MiB line counted as one invalid
  record, JSON logs told apart by Phargus fields under `--allow-logs`, manifest counters refused up front, and a
  failed capture with no event removing both files and naming the fetch cause. It ends `(CORE-240)`. Wrap it at
  80 columns and check it with `npx markdownlint-cli2 CHANGELOG.md` from the repository root. No version changes
  anywhere.
- **Checks (AC-13):** from `src/phargus` run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:integration`, `npm run check:generated`, `npm run check:skills` and `npm run check:package`. Each must
  exit 0. `.cache` already holds the prepared integration build in this worktree; the suite took about 4 s this run.

## Files

- `src/phargus/runtime/records.mjs` — `lines` skips a line over 1 MiB as `null` and drops a leading U+FEFF; `classifyLine` maps `null` to invalid and tells logs apart by Phargus fields
- `src/phargus/runtime/capture.mjs` — SSE loop counts a skipped line once and discards the rest of its message; a failed capture with zero events removes both reserved files
- `src/phargus/runtime/summary.mjs` — `summarizeFile` refuses a manifest whose `quality.invalidRecords` or `quality.ignoredLogs` is not a non-negative integer
- `src/phargus/runtime/phargus.mjs` — the CLI error print appends the fetch cause (`cause.code`, else `cause.message`) after `: `
- `src/phargus/knowledge/tools.md` — lines 28-37 rewritten as in Steps
- `src/phargus/test/data.test.mjs` — new permanent unit tests for AC-1, AC-2, AC-4, AC-5 and AC-6
- `src/phargus/test/summary-regressions.test.mjs` — new permanent unit test for AC-7
- `src/phargus/test/capture.test.mjs` — new permanent unit tests for AC-3, AC-9 and AC-10; the line-79 test rewritten in place for AC-8
- `CHANGELOG.md` — one `phargus` 0.1.1 bullet under `[Unreleased]` `### Fixed` (CORE-240)

- `plugins/phargus/skills/phargus-setup/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-setup/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-setup/scripts/summary.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-setup/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-setup/references/tools.md` — regenerated copy of the changed reference
- `plugins/phargus/skills/phargus-diagnose/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-diagnose/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-diagnose/references/tools.md` — regenerated copy of the changed reference
- `plugins/phargus/skills/phargus-verify/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-verify/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-verify/scripts/summary.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-verify/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-verify/references/tools.md` — regenerated copy of the changed reference
- `plugins/phargus/skills/phargus-memory/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-memory/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-memory/scripts/summary.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-memory/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-memory/references/tools.md` — regenerated copy of the changed reference
- `plugins/phargus/skills/phargus-rules/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-rules/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-rules/scripts/summary.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-rules/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-rules/references/tools.md` — regenerated copy of the changed reference

- `plugins/phargus/plugin.json` — rewritten byte-identical by `npm run build`
- `plugins/phargus/.claude-plugin/plugin.json` — rewritten byte-identical by `npm run build` (version stays 0.1.1)
- `plugins/phargus/LICENSE` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/references/setup.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/references/diagnosis.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/references/verification.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/references/memory.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/references/rules.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`

### Explicitly not touched

- `src/phargus/runtime/operations.mjs` — `collect --follow` and file-mode `collect` already route `classifyLine`'s `invalid` to their existing invalid-record handling; the `null` branch in `classifyLine` is enough
- `src/phargus/runtime/types.d.ts` — no type changes; `lines`'s yield type is declared in its JSDoc
- `src/phargus/runtime/upstream.mjs` — unrelated
- `src/phargus/package.json`, `src/phargus/catalog.json` — no version bump (SPEC non-goal); no script change
- `plugins/phargus/skills/*/SKILL.md` — hand-written; none states the changed behaviour
- `src/phargus/VERIFICATION.json`, `src/phargus/verification/` — eval evidence, never edited by hand
- `.github/scripts/ac-phargus-input-*.test.mjs` — the AC tests, written by `/pharn-test` from `AC-TESTS.md`, never by the build
- `pharn/features/phargus-ordinary-input-problems/AC-TESTS.md`, `AC-TESTS.lock.json` — the mapping and its lock
- `package.json`, `.github/scripts/pharn-test-reporter.mjs` — root test infrastructure

## Acceptance mapping

- AC-1 (BOM) → Approach 1, the one-time U+FEFF strip in `lines`. Permanent test in `test/data.test.mjs`.
- AC-2 (long line in summarize) → Approach 1 (`null` instead of a throw) plus Approach 2 (`classifyLine(null)` is
  invalid). `summarize` returns normally, so the CLI exits 0. Test in `test/data.test.mjs`.
- AC-3 (long line in SSE) → Approach 1 plus the SSE `discard` handling in Approach 2. Test in `test/capture.test.mjs`.
- AC-4 (JSON logs ignored) → Approach 3. The winston `timestamp` is a string, and pino and `{"type":"http"}` carry no
  Phargus field. Test in `test/data.test.mjs`.
- AC-5 (malformed Phargus still invalid) → the truncated line keeps the text test, and `{"timestamp":10}` has a numeric
  `timestamp` (Approach 3). The line-83 test is left as it is. Test in `test/data.test.mjs`.
- AC-6 (without `--allow-logs`) → `fileEvents` already counts `log` as invalid without `allowLogs`, and that rule is
  untouched. Test in `test/data.test.mjs`.
- AC-7 (manifest counters) → Approach 4. Test in `test/summary-regressions.test.mjs`.
- AC-8 (HTTP 401) → Approach 5. The existing message already names `HTTP 401`. The line-79 test is rewritten in place.
- AC-9 (ECONNREFUSED, redirect) → Approach 5 (files) plus Approach 6 (cause in the printed message). Test in
  `test/capture.test.mjs`.
- AC-10 (no valid event from `--file`) → Approach 5. The existing error text stays. Test in `test/capture.test.mjs`.
- AC-11 (tools.md) → the Steps wording plus `npm run build`. `check:generated` exits 0.
- AC-12 (CHANGELOG, versions) → the Steps bullet. No version file is in `## Files` except the generated
  `.claude-plugin/plugin.json`, which `npm run build` rewrites byte-identical from `catalog.json` 0.1.1.
- AC-13 (all checks) → the Steps check run. The permanent tests raise the phargus `npm test` count above today's 58.

## Risks & open questions

- **SPEC Constraint vs CONTRIBUTING.** The Constraint "each acceptance criterion has a unit test in `test/data.test.mjs`,
  `test/summary-regressions.test.mjs` or `test/capture.test.mjs`" is met for AC-1 to AC-10. For AC-11 (tools.md wording),
  AC-12 (CHANGELOG bullet and the 0.1.1 version) and AC-13 (running the checks themselves), a permanent test in those
  files would match English in a reference and the changelog, which CONTRIBUTING drops. It would also pin a release
  number, which CORE-260 removed, or make `npm test` run itself. So the plan covers AC-11 to AC-13 only with the
  `ac-*` files and the existing `check:generated`. The grill or a human should confirm this reading.
- **Where the AC tests live.** `src/phargus` tests are not in the root `npm test` gate the red run and the AC gate
  measure, so `AC-TESTS.md` maps new `.github/scripts/ac-phargus-input-*.test.mjs` files that import
  `src/phargus/runtime/*` and spawn its CLI. Following CONTRIBUTING, they must be folded or dropped before the PR
  merges. AC-11 and AC-13 spawn `npm` scripts in `src/phargus`, which need its `node_modules` and the prepared
  `.cache`. Both are present in this worktree, but not in the root CI job, so the `ac-*` files must not reach CI.
- **Red-before-build conjuncts.** AC-5's and AC-6's Thens are true today, and AC-13's commands pass today. So their
  AC tests each carry one conjunct that only the change makes true, or the red run would refuse them as
  `ac-test-passes-before-build`. AC-5 adds the winston line as a control, which must count as a log while the two
  malformed lines stay invalid. AC-6 contrasts the same file with `--allow-logs`. AC-13 requires the phargus test count
  to exceed 58. Each conjunct is spelled out in `AC-TESTS.md`.
- **The generator writes 63 files.** `npm run build` rewrites every generated path, so all 63 are in `## Files`. Only
  25 change content. The other 38 must come out byte-identical, and `git diff` should show no change in them.
- **Cause text is appended verbatim.** `cause.message` is used only when there is no `cause.code`. Node's `fetch`
  causes name a code, a host and port, or `unexpected redirect`, never request headers, and the bearer token travels
  only in a header. ADVISORY: this rests on undici's current messages, checked on Node 24.13.1.
- **`ENOTFOUND` has no test** (SPEC Assumption). It takes the same `cause.code` path as `ECONNREFUSED`.
- **`check:evals`** fails after any runtime change because the behaviour fingerprint changes. AGENTS.md says this is
  expected, and it is not one of AC-13's commands.
