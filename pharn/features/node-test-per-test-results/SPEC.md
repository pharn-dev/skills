---
spec_id: node-test-per-test-results
state: Approved
spec_content_hash: "13d3af66ce4a1f12404b5bc9e05012f1cd7cff9188c189a5d7cbd79e06c1020e"
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
spec_kind: test-infra
---

## Intent

PHARN's `/pharn-test` cannot write test-first acceptance tests in this repo, so `/pharn-loop` stops before any build
(run `pharn/features/pharn-ci-plugin-0-4-3`, stopped `blocked: no-test-runner`). The reason is that the `test` gate,
`node --test` over three globs, gives PHARN no per-test results: PHARN reads only `jest-json`, `vitest-json`,
`playwright-json` and its own `pharn-json` document (`pharn/pharn-contracts/test-results-record.md`), and Node's
built-in runner writes none of them.

The outcome wanted: the `test` gate writes a `pharn-json` document to the path PHARN passes in `PHARN_TEST_RESULTS`,
so that once the person adds `"testResults": { "test": "pharn-json" }` to `pharn.config.json`, the red-run preflight
no longer reports `ac-level-unavailable … (not-configured)` and `/pharn-loop` can run the pharn-ci plugin work. A
developer running `npm test` by hand sees the same console output as today and gets no extra file.

## Scope

**In scope:**

- A no-dependency `node:test` reporter in this repo that turns the run's test events into one `pharn-json`
  document (`schema`, `suite_errors`, `tests[]` with `file`, `path`, `status`) and writes it to `PHARN_TEST_RESULTS`.
- Wiring it into `package.json`'s `test` script so the normal console reporter still prints to the terminal.
- A test of the reporter itself, run by `npm test`.
- A short note (in the plan, the PR and this repo's docs where test commands are described) that the
  `pharn.config.json` line is the person's edit.

**Out of scope (non-goals):**

- Editing `pharn.config.json`, anything under `pharn/` other than `pharn/features/**`, `.claude/`, or
  `.github/workflows/`: the build's scope setter refuses them in this installed project, so the person adds the
  `testResults` line after the build.
- The pharn-ci plugin update itself (a later `/pharn-loop` run), the pharn and phargus plugins, and `src/phargus`.
- Changing which test files `npm test` runs, or adding a test framework or any npm dependency.

## Acceptance Criteria

- **AC-1** Given `PHARN_TEST_RESULTS` is set to a path in a fresh temporary directory When `npm test` runs to the
  end Then a file exists at that path whose JSON has exactly the keys `schema`, `suite_errors` and `tests`, with
  `schema` equal to `pharn-test-results/1`
  - verify: integration
- **AC-2** Given `PHARN_TEST_RESULTS` is set When `npm test` runs a suite in which every test passes Then every
  entry of the written `tests` array has exactly the keys `file`, `path` and `status`, every `file` is a clean
  relative POSIX path under the repo root, every `path` is a non-empty array whose last element is the test's own
  title, `status` is `passed` for each, and `suite_errors` is `0`
  - verify: integration
- **AC-3** Given a test file with one passing test, one failing test and one skipped test, run through the
  `test` script's reporter wiring with `PHARN_TEST_RESULTS` set When the run ends Then the written document
  reports those three tests with statuses `passed`, `failed` and `skipped`, and each test appears exactly once
  - verify: integration
- **AC-4** Given a test file that throws on import, run through the same wiring with `PHARN_TEST_RESULTS` set
  When the run ends Then the written document's `suite_errors` is at least `1`
  - verify: integration
- **AC-5** Given `PHARN_TEST_RESULTS` is not set When `npm test` runs Then no results file is written anywhere in
  the repo, and the console output still shows the default reporter's per-test lines and its pass and fail totals
  - verify: integration
- **AC-6** Given the person has added `"testResults": { "test": "pharn-json" }` to `pharn.config.json` When
  `node pharn/floor/check-red-run.mjs --preflight` runs against an AC-TESTS.md mapping a `unit` criterion to a file
  under `plugins/pharn-ci/tests/` Then its output carries no `ac-level-unavailable` line for that criterion
  - verify: integration
- **AC-7** Given the person's `testResults` line is in place When PHARN's gate runner runs the `test` gate with one
  of the files the `test` script's globs already match appended as a positional argument Then the per-test record
  derived from the written file has no `duplicate-test-id` anomaly for that file's tests
  - verify: integration

## Constraints

- No new npm dependency: the reporter uses Node core only (`node:test` reporter streams, `node:fs`, `node:path`).
- Works on the Node versions the repo supports: `package.json` engines `>=22.18.0`, and the Node 24.13.1 CI uses.
- The document follows the `pharn-json` rules exactly (`pharn/pharn-contracts/test-results-record.md`, "The
  neutral format"): no extra or missing key, `status` only `passed`, `failed` or `skipped`, no `./` path.
- `npm run check` stays green (format, lint, markdown lint, action pins, tests).
- Build stages write files only with Edit or Write, never through Bash.

## Assumptions

- A reporter module kept in this repo (for example under `.github/scripts/`) is acceptable; the plan picks the place.
- A `todo` test maps to `skipped`, as the other formats do; a test Node reports as cancelled maps to `failed`.
- A failure no test owns (a file that fails to load) counts once per such file in `suite_errors`.
- PHARN's red run and verify AC gate append mapped files to `npm test`; whether `node --test` runs a file twice when
  it matches both a glob and an appended argument is checked by the plan (AC-7 holds either way).
- The `pharn.config.json` line is added by the person after the build and before the next `/pharn-loop` run; AC-6
  and AC-7 are checked with that line in place.
- The `/pharn-test` stage records a bootstrap lock for this test-infra SPEC (no tests before the build), which is
  weaker than test-first; the record says so.
