---
spec_id: phargus-signals-stop-every-command
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
spec_kind: quick
---

## Intent

S4.6 (CORE-239). The phargus CLI swallows the first SIGINT or SIGTERM for most of its commands. It
registers its stop handlers for every command, so for `summarize`, `compare`, `heap`, `rules`, `doctor`
and `capture --file` Node's default action on the first signal no longer applies and nothing reads the
abort: a user pressing Ctrl-C, or a supervisor sending SIGTERM, does not stop the command. Killed
outright instead, `capture --file` leaves a 0-byte `manifest.json` that no later command can read. The
user wants every phargus command to stop on the first signal: `collect` and `capture` stop cleanly and
keep what they measured, and every other command ends the way any Node process does.

## Scope

**In scope:**

- Stop handlers registered only for `collect` and `capture` (both `--file` and `--url`); every other
  command keeps Node's default action for SIGINT and SIGTERM.
- `capture --file` stops reading on the signal and writes its manifest with termination `interrupted`
  and `quality.truncated` true, as `capture --url` already does; a capture that wrote zero events still
  removes both of its files (the S4.7 behaviour).
- No SIGINT or SIGTERM listener stays registered after a command returns.
- Permanent, behaviour-named tests in `src/phargus/test` (unit) and `src/phargus/test/integration`
  (collect), and one `phargus` 0.1.1 bullet under the CHANGELOG's `[Unreleased]` `Fixed` heading.

**Out of scope (non-goals):**

- Threading an abort signal through `summarize`, `compare`, `heap`, `rules` or `doctor`: they keep
  Node's default signal action instead of stopping cleanly.
- Any change to what `collect` or `capture --url` do on a signal, or to capture's exit status.
- Windows signal behaviour: the signal tests are skipped on win32.
- A plugin version bump: `src/phargus/package.json` already reads 0.1.1.

## Acceptance Criteria

- **AC-1** Given a phargus command other than `collect` and `capture` is running, for example
  `phargus summarize --file <fifo>` reading a FIFO whose writer is still open, When the process receives
  SIGTERM (or SIGINT) Then the child process ends promptly by that signal (its exit signal is SIGTERM,
  status 143 in a shell; SIGINT for SIGINT) and prints no result on stdout, and any phargus command run
  in-process through `main()` leaves `process.listenerCount('SIGINT')` and
  `process.listenerCount('SIGTERM')` equal to their values before the call once it returns
  - verify: unit
- **AC-2** Given `phargus capture --out <dir>` is running, either with `--file <fifo>` on a FIFO that has
  delivered at least one valid Phargus event and is still open, or with `--url` against a local SSE
  server that has sent at least one event, When the process receives SIGTERM Then `<dir>/manifest.json`
  parses as JSON with `termination` equal to `"interrupted"` and `quality.truncated` equal to true, and
  `phargus summarize --file <dir>/events.ndjson --manifest <dir>/manifest.json` succeeds on it; when no
  valid event had arrived before the signal, neither `events.ndjson` nor `manifest.json` exists in
  `<dir>` afterwards
  - verify: unit
- **AC-3** Given `phargus collect --follow` is running against the prepared upstream on an input file
  that is still open for appending, When the process receives SIGTERM (or SIGINT) Then it exits with
  status 0 and prints its JSON result on stdout
  - verify: integration

## Constraints

- Signal tests run phargus as a child process, are skipped on win32, and wait for a readiness signal
  from the child (an event observed, a line on a stream, a listening server) rather than a fixed sleep.
- Tests are permanent and named for the behaviour they check; no `ac-*.test.mjs` file.
- Done when, from `src/phargus`, all of these pass: `npm run format:check`, `npm run lint`,
  `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run check:generated`,
  `npm run check:skills`, `npm run check:package`.
- Node `>=22.18.0`, as `src/phargus/package.json` `engines` declares.

## Assumptions

- The description's five acceptance criteria are written as three without dropping any: (1) and (5)
  form AC-1, (3) and (4) form AC-2, and (2) is AC-3.
- One child-process test on `summarize` stands for `compare`, `heap`, `rules` and `doctor`, as the
  description's test list names only `summarize`; AC-1 still states the outcome for all of them.
- The zero-event clause of AC-2 is the existing S4.7 behaviour, kept rather than added; it is observed
  through `--file` because a FIFO is the simplest source that can stay open with no event delivered.
- AC-1 and AC-2 are `unit` because their tests run in `src/phargus`'s `npm test` and need no prepared
  upstream; AC-3 is `integration` because `collect` needs the prepared upstream, which only
  `npm run test:integration` loads.
- The description gives no exit status for an interrupted `capture`; it is left as it is today.
- The repository root `package.json` `test` script does not run `src/phargus/test`; this feature's
  runner is `node --test` through `src/phargus`'s own `test` and `test:integration` scripts. Not checked
  here: whether PHARN's test stage finds that runner (its own preflight decides).
