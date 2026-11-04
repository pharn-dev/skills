---
spec_id: node-test-per-test-results
spec_content_hash: "13d3af66ce4a1f12404b5bc9e05012f1cd7cff9188c189a5d7cbd79e06c1020e"
applied_lessons: none
---

## Approach

> ADVISORY — model work. Derived from the Approved SPEC (`check-spec-approved.mjs` GREEN this run). The SPEC is
> `spec_kind: test-infra`, so `check-ac-tests.mjs --spec` exits 4 (bootstrap): this plan writes **no AC-TESTS.md**,
> and `/pharn-test` records a bootstrap lock (weaker than test-first; nothing fails before the build).

Add one Node-core-only `node:test` custom reporter, `.github/scripts/pharn-test-reporter.mjs`, and load it in the
`test` script **next to** the `spec` reporter, both with `--test-reporter-destination=stdout`. The custom reporter
yields nothing to its stream (so the terminal shows only `spec`'s output), collects `test:start` / `test:pass` /
`test:fail` events, and, when the run ends, writes one `pharn-json` document to `process.env.PHARN_TEST_RESULTS` —
only when that variable is a non-empty string. With it unset the reporter writes nothing anywhere.

Behaviour measured this run on Node 24.13.1 and 22.18.0 with a scratch prototype (outside the repo), which the build
re-implements cleanly:

- **Path.** Keep one title stack per `data.file`: on `test:start` truncate it to `data.nesting` and push `data.name`;
  on `test:pass`/`test:fail` the entry's `path` is `stack.slice(0, nesting)` plus `data.name` (describe titles first,
  own title last). Node reports a file's events in tree order, so the per-file stack is enough even when files run
  concurrently.
- **Which events are tests.** Every event with `details.type === "test"` (a `test()` with subtests is an entry, and so
  is each subtest — distinct paths). `details.type === "suite"` (a `describe`) is never an entry.
- **Status.** `test:pass` → `skipped` when `skip` or `todo` is set, else `passed`. `test:fail` → `skipped` when `todo`
  is set (SPEC assumption), else `failed` — which covers a cancelled test (`failureType: cancelledByParent`).
- **suite_errors (failures no test owns).** Node wraps each file in a file-level test named
  `path.relative(cwd, file)` at nesting 0. It reports a `test:fail` for it when the file throws on import, or when the
  file's process ends non-zero with no failing test (measured: `process.exitCode = 1` in an `after` hook). Each such
  `test:fail` adds 1 to `suite_errors` (once per file) and is never an entry; a passing file-level event is ignored.
  Also counted: a failed `suite` whose `failureType` is not `subtestsFailed` (a hook failure no test owns), and a
  `test:fail` event with no `data.file`.
- **file.** `data.file` (absolute) made relative to `process.cwd()` when it lies under it, with `path.sep` replaced by
  `/` — npm runs the script at the repo root, so every entry is a clean relative POSIX path (measured over the real
  suite: 83 tests, 7 files, all `passed`, 0 suite errors, 0 duplicate ids). A file outside the cwd keeps its absolute
  path, which `pharn-json` allows.
- **Document.** Exactly `{ schema: "pharn-test-results/1", suite_errors, tests }`; each test exactly
  `{ file, path, status }`. Written with `writeFileSync` once, after the event stream ends. The reporter never creates
  directories (PHARN creates `<out>`; AC-1 uses an existing temp directory).
- **Duplicates are reported, never hidden.** The reporter does not dedupe entries: two tests with one path stay two
  entries, so PHARN marks them `duplicate-test-id`.

**AC-7 (append a matched file).** Measured on both Node versions: `node --test a.test.mjs a.test.mjs` runs the file
once, so `npm run test -- <a file the globs match>` (how `run-gates.mjs` appends files) produces no duplicate
entries. The prototype over the real suite with `plugins/pharn-ci/tests/pins.test.mjs` appended confirmed it. The
reporter test pins this per Node version in CI.

**The person's edit.** The build cannot write `pharn.config.json` (the installed project's scope setter refuses it).
After the build, the person adds `"testResults": { "test": "pharn-json" }` to it; AC-6 and AC-7, and verify's bootstrap
evidence, are read with that line in place. `CONTRIBUTING.md` says so, and the PR must too.

## Applied lessons

- none — `check-lessons-index.mjs --verdict` printed `NO_CANON`: this project has no `pharn/memory-bank/` lessons yet,
  so there is nothing to apply.

## Steps

- Write `.github/scripts/pharn-test-reporter.mjs`: a default-exported `async function*` reporter (Node core only:
  `node:fs`, `node:path`) implementing the rules in Approach; a header comment naming the `pharn-json` contract
  (`pharn/pharn-contracts/test-results-record.md`, "The neutral format") and stating that it writes only to
  `PHARN_TEST_RESULTS` and nothing when the variable is unset.
- Change `package.json`'s `test` script to
  `node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./.github/scripts/pharn-test-reporter.mjs --test-reporter-destination=stdout`
  followed by the three existing globs, unchanged and in the same order. No dependency, no other script changes.
- Write `.github/scripts/pharn-test-reporter.test.mjs` (already matched by the `.github/scripts/*.test.mjs` glob, so
  the set of globs `npm test` runs does not change). It reads the reporter flags from `package.json`'s `test` script
  (the tokens between `node --test` and the first glob), resolves the reporter's `./` path against the repo root, and
  spawns `process.execPath` with those flags over fixture files it writes into a fresh `mkdtemp` directory, with that
  directory as `cwd`. **Every spawn builds its env explicitly:** `process.env` minus `NODE_TEST_CONTEXT` (else the
  nested `node --test` reports into the outer runner instead of running its own reporters) and minus
  `PHARN_TEST_RESULTS` (else a nested run overwrites the outer gate's results file), plus the test's own
  `PHARN_TEST_RESULTS` when the case needs one. Cases:
  - pass / fail / skip / todo inside a `describe`, plus a top-level test with a subtest → exact top-level keys,
    `schema` value, exact per-test keys, statuses `passed`/`failed`/`skipped`/`skipped`, each test once, `path` values
    (`["outer","passes"]`, `["top","sub"]`), clean relative POSIX `file`, `suite_errors` 0 (AC-1/AC-2/AC-3 shape).
  - a fixture that throws on import → `suite_errors >= 1`, and no entry for that file (AC-4).
  - an all-passing fixture with `PHARN_TEST_RESULTS` unset → the temp directory holds only the fixture afterwards, and
    stdout shows the `spec` per-test line (`✔ <title>`) and the totals lines (`ℹ pass 1`, `ℹ fail 0`) (AC-5).
  - one fixture passed twice as a positional argument → each of its tests appears exactly once (AC-7's mechanism).
- Prettier and ESLint the three code files by name (`npx prettier --write <file>` per file, never a directory or glob);
  run `npm run check`.
- Add a short paragraph to `CONTRIBUTING.md` (near "CI gates"): `npm test` also loads
  `.github/scripts/pharn-test-reporter.mjs`, which writes PHARN's `pharn-json` per-test results to
  `$PHARN_TEST_RESULTS` only when PHARN sets that variable; PHARN reads it only after the person adds
  `"testResults": { "test": "pharn-json" }` to `pharn.config.json` (installed by the PHARN CLI, so a person's edit,
  not a build's). Markdown must pass `npm run lint:md`.

## Files

- `.github/scripts/pharn-test-reporter.mjs` — new: the Node-core `node:test` reporter that writes the `pharn-json` document to `PHARN_TEST_RESULTS`
- `.github/scripts/pharn-test-reporter.test.mjs` — new: integration tests of the reporter through the `test` script's reporter flags
- `package.json` — the `test` script gains the `spec` reporter and the custom reporter, both to stdout; the globs are unchanged
- `CONTRIBUTING.md` — a short note on the reporter and on the `pharn.config.json` line being the person's edit

### Explicitly not touched

- `pharn.config.json` — the person adds the `testResults` line after the build; the scope setter refuses it here
- `pharn/` — installed by the PHARN CLI (only `pharn/features/**` is the pipeline's, and the build writes none of it)
- `.claude/` — installed by the PHARN CLI
- `.github/workflows/ci.yml` — out of scope; CI already runs `npm test` on Node 24 and 22.18.0, which runs the new test
- `src/phargus/` — out of scope
- `plugins/` — the pharn-ci, pharn and phargus plugins are out of scope; their test files are only run, never edited
- `.github/scripts/changed-skills.test.mjs` — existing test, unchanged
- `.github/scripts/check-action-pins.test.mjs` — existing test, unchanged
- `package-lock.json` — no dependency changes

## Acceptance mapping

- **AC-1** (file with exactly `schema`/`suite_errors`/`tests`, `schema` = `pharn-test-results/1`) → the reporter's
  document shape; the reporter test asserts the exact key set and value on a fixture run; the whole-suite check is
  `PHARN_TEST_RESULTS=<fresh tmp>/r.json npm test` followed by reading the file (verify, and PHARN's own `pharn-json`
  parser, which refuses any extra or missing key).
- **AC-2** (all-passing suite: exact per-test keys, clean relative POSIX `file`, non-empty `path` ending in the own
  title, all `passed`, `suite_errors` 0) → path/stack and cwd-relative `file` rules; the reporter test asserts them on
  fixtures; the whole suite was measured clean this run (83 tests) and is re-read at verify.
- **AC-3** (pass/fail/skip once each through the wiring) → status mapping; the reporter test runs the `test` script's
  own reporter flags over a mixed fixture.
- **AC-4** (import throw → `suite_errors >= 1`) → file-level `test:fail` counting; the reporter test's throwing fixture.
- **AC-5** (unset → no file, `spec` per-test lines and totals still shown) → the reporter writes only when the
  variable is set; `spec` stays a reporter to stdout; the reporter test's unset case.
- **AC-6** (preflight has no `ac-level-unavailable` for a `unit` row under `plugins/pharn-ci/tests/`) → `preflight()`
  in `red-run-core.mjs` reports `not-configured` only while `pharn.config.json` lacks `testResults.test`; with the
  person's line in place and the `test` script present it passes. Checked after the person's edit by running
  `node pharn/floor/check-red-run.mjs --preflight --ac-tests <mapping> --discover package.json --root .` on a scratch
  mapping under `pharn/.run/` — no code here beyond the reporter.
- **AC-7** (an appended matched file → no `duplicate-test-id` for its tests) → `node --test` dedupes a repeated path
  (measured on 24.13.1 and 22.18.0); the reporter adds no duplicates of its own; the reporter test's repeated-argument
  case pins it on both CI Node versions.

## Risks & open questions

- **Verify needs the person's line first.** Bootstrap verify evidence requires per-test results for the `test` gate,
  and that needs `"testResults": { "test": "pharn-json" }` in `pharn.config.json`, which no stage may write. Unless
  the person adds it after `/pharn-build` and before `/pharn-verify`, the AC gate reads `not-configured` and verify is
  INCONCLUSIVE, not PASS. The orchestrator should surface this to the human at the build→verify boundary.
- **Node 22 CI log format.** Naming any `--test-reporter` turns off Node's default. Node 24 defaults to `spec` in every
  context and by hand on a TTY both versions show `spec`, so a developer sees the same output. But Node 22.18.0 without
  a TTY (the CI `node-floor` leg) defaults to TAP (measured), so that leg's log switches from TAP to `spec`. Exit codes
  and test selection are unchanged.
- **Node internals.** The file-level test's name (`path.relative(cwd, file)`) and its `test:fail` on an import error
  are Node behaviour, not a documented API; measured on both supported versions and pinned by the reporter test on
  both CI legs, so a Node change fails `npm test` rather than silently dropping suite errors.
- **Nested-run hygiene.** A reporter test that forgets to strip `NODE_TEST_CONTEXT` or `PHARN_TEST_RESULTS` either
  breaks or clobbers the outer gate's results file; the helper must build the env in one place.
- **"passed" is the reporter's word** (`test-results-record.md`, "What it proves"): the reporter and the `test` script
  are project code, so this increment narrows nothing about provenance.
- **Unrelated working-tree change.** `git status` at session start showed an uncommitted edit to
  `.github/workflows/ci.yml` that this feature does not own; the build must not touch or commit it.
