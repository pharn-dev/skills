---
spec_id: phargus-signals-stop-every-command
spec_content_hash: 7fb11c38b4a09f83fba00aa9689fceceb1928c0111d8da3a91ecf31eb3773e14
applied_lessons: none
---

## Approach

ADVISORY (model work). Today `main` in `src/phargus/runtime/phargus.mjs` registers `process.once('SIGINT'|'SIGTERM')`
before its `switch`, for every command. The plan moves that registration into a small wrapper that only the `collect`
and `capture` cases use. It also teaches `fileEvents` to stop on an abort signal, so `capture --file` ends with an
`interrupted` manifest. The plan adds no new behaviour to `collect` or `capture --url`, changes no exit status and
bumps no version.

1. **Make `main` callable in-process (new `runtime/commands.mjs`).** AC-1 needs `main()` run in-process. Today,
   importing `phargus.mjs` runs `main(process.argv.slice(2))` at load, so a test that imports it also runs a stray
   command and prints to stdout. Move `main` unchanged (its `parseArgs` options, help object, `required`/`number`
   helpers and `switch`) into `src/phargus/runtime/commands.mjs`, exported as `main`. `phargus.mjs` keeps only the
   entry point: `import { main } from './commands.mjs'`, the existing `errorMessage` helper, and the unconditional
   `main(process.argv.slice(2)).then(...).catch(...)` block, unchanged. It no longer exports anything. No file imports
   `main` today (checked with grep this run: tests use `phargus.mjs` only as a CLI path). An "am I the entry module"
   guard was considered and rejected. It compares `process.argv[1]` with `import.meta.url`, which differ under symlinks
   (macOS `/tmp`, `/var/folders`) and `--preserve-symlinks-main`. A mismatch would make every skill's CLI silently do
   nothing. The split has no such failure mode.

2. **Register stop handlers only for `collect` and `capture` (`commands.mjs`).** Delete the controller block and the
   `try/finally` around the `switch`. Add one private helper and wrap only the two stoppable cases:

   ```js
   /**
    * Runs a command that stops cleanly: the first SIGINT or SIGTERM aborts its signal. Other
    * commands keep Node's default action, so a signal ends them at once.
    * @template T @param {(signal: AbortSignal) => Promise<T>} run @returns {Promise<T>}
    */
   async function stoppable(run) {
     const controller = new AbortController();
     const stop = () => controller.abort();
     process.once('SIGINT', stop);
     process.once('SIGTERM', stop);
     try {
       return await run(controller.signal);
     } finally {
       process.removeListener('SIGINT', stop);
       process.removeListener('SIGTERM', stop);
     }
   }
   // case 'collect': return await stoppable((signal) => collect({ ...as today, signal }));
   // case 'capture': return await stoppable((signal) => capture({ ...as today, signal }));
   ```

   `doctor`, `summarize`, `compare`, `heap` and `rules` (and `help`) register nothing, so the first signal ends the
   process with Node's default action, by that signal. The `finally` removes both listeners on success and on
   rejection, so no listener survives a returned or failed command (Scope bullet 3). The `once` semantics match today:
   a second signal of the same kind during shutdown gets Node's default action.

3. **`capture --file` stops on the signal (`runtime/records.mjs`, `runtime/capture.mjs`).**
   - `fileEvents(path, status, options)` accepts `options.signal` (JSDoc
     `{maxEvents?: number, allowLogs?: boolean, signal?: AbortSignal}`) and passes it to
     `createReadStream(path, { highWaterMark: 64 * 1024, signal: options.signal })`. An abort destroys the stream,
     and its async iterator throws an `AbortError`. A new `catch` around the existing `for await` rethrows unless
     `options.signal?.aborted`. When the signal aborted, the generator just returns, so the caller decides how to record
     the stop. The `finally { stream.destroy() }` stays. `summarizeFile`, `readWindows` and file-mode `collect` pass
     no signal, so they behave as before.
   - `capture` already passes its whole `options` (which carries `signal`) to `fileEvents`. Right after the
     `for await` loop and before the zero-event check, add:

     ```js
     // A file read stops quietly on the signal; record why, as sseEvents does for --url.
     if (!options.url && options.signal?.aborted) {
       manifest.termination = 'interrupted';
       manifest.quality.truncated = true;
     }
     ```

     With at least one event, the manifest is written with `termination: "interrupted"` and `quality.truncated: true`.
     `capture` then returns normally, so the CLI prints its result and exits 0, as an interrupted `capture --url` does
     today. With zero events, the existing `capture contains no valid Phargus events` throw and the S4.7 branch remove
     both reserved files. The `limit` relabel (`truncated && termination === 'eof'`) cannot override
     `interrupted`. `sseEvents` and the `--url` path are untouched.

4. **CHANGELOG.** Add one `phargus` 0.1.1 bullet under `[Unreleased]` `### Fixed` (CORE-239).

**Tests.** The SPEC asks for permanent, behaviour-named tests under `src/phargus/test` and `src/phargus/test/integration`
and no `ac-*.test.mjs` file. So `AC-TESTS.md` maps two new, behaviour-named files there, and `/pharn-test` writes them
before the build. They are the permanent tests: `src/phargus`'s `npm test` (`test/*.test.mjs`) and
`npm run test:integration` (`test/integration/*.test.mjs`) pick them up by their existing globs. The PHARN red run
hands them to the root `test` gate after `--`, so they must also run from the repository root (paths built from
`import.meta.url`). The build writes no test file.

## Applied lessons

- none: `node pharn/floor/check-lessons-index.mjs . --verdict` printed `NO_CANON` this run. The project has no
  `pharn/memory-bank/lessons-learned.md` with promoted lessons, so there was nothing to read or apply.

## Steps

- **commands.mjs (new):** move `main` from `phargus.mjs` with its imports (`parseArgs`, `doctor`, `capture`,
  `summarizeFile`, `compareSummaries`, `collect`, `heap`, `replayRules`) and the `commands` list. Remove the
  controller block and the outer `try/finally`. Add `stoppable` (Approach 2) and wrap the `collect` and `capture` cases
  in it, passing the wrapper's `signal` where `controller.signal` was. Keep the `@param {string[]} args` JSDoc.
- **phargus.mjs:** reduce to the entry point (Approach 1). Keep `errorMessage` and the `.then/.catch` block
  byte-for-byte. Update the closing comment to say that `main` lives in `commands.mjs` so tests can run it
  in-process.
- **records.mjs:** add `signal` to `fileEvents`'s options and the stream, plus the abort-only `catch`
  (Approach 3). Update the JSDoc.
- **capture.mjs:** add the interrupted branch after the record loop (Approach 3). Extend the
  `@param` type of `capture` only if `tsc` needs it (it already declares `signal?: AbortSignal`).
- **Regenerate:** from `src/phargus` run `npm run build`. It writes every path under `plugins/phargus` listed below.
  The copies of `phargus.mjs`, `records.mjs` and `capture.mjs` change, five new `commands.mjs` copies appear, and the
  rest are rewritten byte-identical. Then run `npm run check:generated`.
- **Format:** from `src/phargus`, run Prettier on the changed sources only, named one by one:
  `npx prettier --write --config .prettierrc.json runtime/commands.mjs runtime/phargus.mjs runtime/records.mjs runtime/capture.mjs`.
  Never run `npm run format`, which formats whole directories. The generator formats its own outputs.
- **CHANGELOG.md:** add, after the existing CORE-240 `` `phargus` 0.1.1: `` bullet under `[Unreleased]`
  `### Fixed`, one bullet in the file's style starting `` - `phargus` 0.1.1: ``. Say that every command stops on the
  first SIGINT or SIGTERM: `summarize`, `compare`, `heap`, `rules`, `doctor` end with Node's default action. Say that
  `capture --file` writes its manifest with `termination` `interrupted` and `quality.truncated` true, as
  `capture --url` does, instead of leaving a 0-byte `manifest.json` when killed, and that no signal listener stays
  registered after a command returns. End with `(CORE-239)`. Wrap at 80 columns and check it with
  `npx markdownlint-cli2 CHANGELOG.md` from the repository root. No version changes anywhere.
- **Checks (SPEC Constraints):** from `src/phargus` run `npm run format:check`, `npm run lint`, `npm run typecheck`,
  `npm test`, `npm run test:integration`, `npm run check:generated`, `npm run check:skills` and
  `npm run check:package`. Each must exit 0. `.cache/integration.json` and the prepared application are present in
  this worktree (read this run).

## Files

- `src/phargus/runtime/commands.mjs` — new: `main` moved from `phargus.mjs`; stop handlers registered only for `collect` and `capture` through a private `stoppable` wrapper that always removes them
- `src/phargus/runtime/phargus.mjs` — reduced to the executable entry point: imports `main` from `./commands.mjs`, keeps `errorMessage` and the output and exit-code handling
- `src/phargus/runtime/records.mjs` — `fileEvents` accepts `options.signal`, passes it to the read stream and returns quietly when that signal aborted
- `src/phargus/runtime/capture.mjs` — an aborted `capture --file` records `termination` `interrupted` and `quality.truncated` true
- `CHANGELOG.md` — one `phargus` 0.1.1 bullet under `[Unreleased]` `### Fixed` (CORE-239)

- `plugins/phargus/skills/phargus-setup/scripts/commands.mjs` — new generated copy of the new helper
- `plugins/phargus/skills/phargus-setup/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-setup/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-setup/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-diagnose/scripts/commands.mjs` — new generated copy of the new helper
- `plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-diagnose/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-diagnose/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-verify/scripts/commands.mjs` — new generated copy of the new helper
- `plugins/phargus/skills/phargus-verify/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-verify/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-verify/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-memory/scripts/commands.mjs` — new generated copy of the new helper
- `plugins/phargus/skills/phargus-memory/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-memory/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-memory/scripts/capture.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-rules/scripts/commands.mjs` — new generated copy of the new helper
- `plugins/phargus/skills/phargus-rules/scripts/phargus.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-rules/scripts/records.mjs` — regenerated copy of the changed helper
- `plugins/phargus/skills/phargus-rules/scripts/capture.mjs` — regenerated copy of the changed helper

- `plugins/phargus/plugin.json` — rewritten byte-identical by `npm run build`
- `plugins/phargus/.claude-plugin/plugin.json` — rewritten byte-identical by `npm run build` (version stays 0.1.1)
- `plugins/phargus/LICENSE` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/references/tools.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/references/setup.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/scripts/summary.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-setup/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/references/tools.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/references/diagnosis.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-diagnose/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/references/tools.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/references/verification.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/scripts/summary.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-verify/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/references/tools.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/references/memory.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/scripts/summary.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-memory/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/agents/openai.yaml` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/references/compatibility.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/references/data.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/references/tools.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/references/rules.md` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/scripts/operations.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/scripts/summary.mjs` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/scripts/types.d.ts` — rewritten byte-identical by `npm run build`
- `plugins/phargus/skills/phargus-rules/scripts/upstream.mjs` — rewritten byte-identical by `npm run build`

### Explicitly not touched

- `src/phargus/runtime/operations.mjs` — `collect` already reads `options.signal`; its stop behaviour is unchanged (SPEC non-goal)
- `src/phargus/runtime/summary.mjs`, `src/phargus/runtime/upstream.mjs` — no abort signal is threaded through `summarize`, `compare`, `heap`, `rules` or `doctor` (SPEC non-goal)
- `src/phargus/runtime/types.d.ts` — `CaptureManifest.termination` is already `string`
- `src/phargus/knowledge/tools.md` and the other references — the SPEC's scope names no doc change; `tools.md` already says `collect` serves until SIGINT/SIGTERM
- `src/phargus/package.json`, `src/phargus/catalog.json` — no version bump (SPEC non-goal); no script change
- `plugins/phargus/skills/*/SKILL.md` — hand-written; none states signal behaviour
- `src/phargus/VERIFICATION.json`, `src/phargus/verification/` — eval evidence, never edited by hand
- `src/phargus/test/signals.test.mjs`, `src/phargus/test/integration/collect-signals.test.mjs` — the AC tests, written by `/pharn-test` from `AC-TESTS.md`, never by the build
- `pharn/features/phargus-signals-stop-every-command/AC-TESTS.md`, `AC-TESTS.lock.json` — the mapping and its lock
- `package.json`, `.github/scripts/pharn-test-reporter.mjs` — root test infrastructure

## Acceptance mapping

- AC-1 (a non-stoppable command ends by the signal; no listener left) → Approach 2. `summarize` registers no
  handler, so SIGTERM or SIGINT takes Node's default action. Measured this run on Node 24.13.1: a process blocked
  reading a FIFO whose writer is open ends at once with status 143 under SIGTERM's default action. `stoppable`'s
  `finally`, together with no registration for the other commands, keeps both listener counts unchanged across every
  in-process `main()` call. Approach 1 makes that call possible without the entry side effect. Test:
  `src/phargus/test/signals.test.mjs`.
- AC-2 (interrupted capture keeps its data; zero events leaves nothing) → Approach 3 for `--file`. `--url` already
  records `interrupted` in `sseEvents`, which is untouched. The zero-event clause is the existing S4.7 removal, reached
  through the existing `no valid Phargus events` throw. Test: `src/phargus/test/signals.test.mjs`.
- AC-3 (`collect --follow` still exits 0 with its result) → Approach 2 keeps `collect` inside `stoppable`, so its
  abort path is exactly today's. Test: `src/phargus/test/integration/collect-signals.test.mjs`.
- SPEC Constraints → the Steps check run. The CHANGELOG bullet is in `## Files`. No version file changes, except the
  generated `.claude-plugin/plugin.json`, which `npm run build` rewrites byte-identical from `catalog.json` 0.1.1.

## Risks & open questions

- **A FIFO read cannot be cancelled, so an interrupted `capture --file` on a pipe whose writer stays open writes its
  manifest at once but its process exits only when the writer closes (or on a second signal).** ADVISORY, measured
  this run on Node 24.13.1. After one chunk has arrived from a FIFO, an aborted `createReadStream` lets the JS side
  continue at once (the `AbortError` arrives promptly). But the blocked libuv `read` keeps the process alive until the
  writer closes, and `process.exit()` waits for it too (8 s in both probes). Once `capture` returns, `stoppable` has
  removed both listeners, so a second SIGINT or SIGTERM ends the process at once with the manifest already on disk.
  Regular files, the documented `--file` input, do not block. AC-2's Then (the manifest's content and a working
  `summarize`) does not depend on the exit. So the AC-2 test waits for `events.ndjson` to hold a line before the
  signal, and for the child's stdout result (or stderr error) after it, then closes its FIFO writer before awaiting
  exit. Making the exit prompt would need a non-threadpool FIFO reader (`net.Socket` on the fd), which this plan does
  not add. The grill or a human should confirm that the limit is acceptable.
- **AC-3's Then already holds before the build** (`collect` keeps its handlers), and the red run refuses a passing AC
  test (`ac-test-passes-before-build`, no escape hatch). So the AC-3 test carries one contrast conjunct that only the
  change makes true. In the same prepared upstream, `phargus rules --project <project> --file <fifo>` ends by SIGTERM,
  so stop handlers are per command, not process-wide. This exercises AC-1's stated outcome for `rules`, which the SPEC
  extends to every non-stoppable command. The grill should confirm the conjunct. Likewise, AC-1 and AC-2 each keep
  their whole Then in one test (`AC-1:` and `AC-2:` leaf titles), because the in-process listener check and the
  `--url` capture both pass today and would each be refused alone.
- **`AC-<n>:` leaf titles in permanent files.** The red run and the AC gate match a test by its file and an `AC-<n>:`
  leaf-title prefix, so the two new files carry those prefixes through `/pharn-verify`. The file names are
  behaviour-named, there is no `ac-*.test.mjs` file, and every title after the prefix names the behaviour. CONTRIBUTING
  asks for "a name that says what it guards". Whether the `AC-<n>: ` prefix is dropped when the PR is prepared is the
  person's call.
- **The AC tests run in two harnesses.** The root `test` gate runs them (red run, AC gate) with the repository root as
  cwd. `src/phargus`'s `npm test` and `test:integration` also run them. They must build paths from `import.meta.url`,
  import `../runtime/commands.mjs` inside the test body (it does not exist before the build), skip on win32, and
  bound every wait with a deadline. On a deadline the test kills the child with SIGKILL and closes its FIFO writer, so
  a red run fails instead of hanging. The integration file reads `src/phargus/.cache/integration.json`, which exists in
  this worktree (read this run) but only after `npm run prepare:integration` elsewhere. `src/phargus`'s `tsc`
  type-checks `test/**/*.mjs`, so `/pharn-test` must write them type-clean.
- **New runtime module.** `commands.mjs` adds five generated copies. A copied standalone skill still runs because
  the generator copies every `runtime/*.mjs` into each skill's `scripts/`. `check:package` and the integration test
  `a copied standalone skill uses the application package` cover this.
- **`check:evals`** fails after any runtime change because the behaviour fingerprint changes. AGENTS.md says this is
  expected, and it is not among the SPEC's done-when commands.
- **Opening a FIFO's write end.** A plain `open(fifo, 'w')` in the test process blocks a libuv thread until a reader
  appears, and a child that never opens it would hang the test process. AC-TESTS.md therefore names the non-blocking
  open (`O_WRONLY | O_NONBLOCK`, retried on `ENXIO`) as the readiness signal.
