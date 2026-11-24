# Changelog

All notable changes to this repository are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and plugins follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each plugin is versioned and released on its own. A release heading names the
plugin and its version, and its tag is `<plugin>-vX.Y.Z`, for example
`pharn-v0.3.1` or `phargus-v0.1.0`. Releases up to `pharn` 0.3.0 predate
`phargus` and cover only `pharn`. See [Releasing](CONTRIBUTING.md#releasing).

## [Unreleased]

### Added

- Repository tests: `.github/scripts/skill-frontmatter.test.mjs` checks every
  shipped `plugins/*/skills/*/SKILL.md` (from `git ls-files`) against the
  Agent Skills spec: `name` matches its directory, is at most 64 characters and
  matches `^[a-z0-9]+(-[a-z0-9]+)*$`; `description` is one line of 1 to 1024
  characters; `compatibility`, when present, is at most 500. The frontmatter is
  read by hand, so the root package gains no dependency. Before, only `phargus`
  was checked (`src/phargus/scripts/validate.mjs`).

### Changed

- `pharn` (no plugin version change yet): the `pharn-cli` skill describes the
  `update` contract of pharn-cli 0.20.0 (unreleased, pharn-cli PRs #386 and
  #390) next to the older one. From 0.20.0 `--json` implies `--dry-run` and
  `--compact` implies `--json`, so `update --json` runs the preview instead of
  being refused; the skill still spells out `--dry-run` for the preview and
  never adds `--json` or `--compact` to a real run. From 0.20.0 every `update`
  downloads and plans: `up-to-date` (still `plan: null`) means the plan changes
  nothing, the text run ends `Up to date.` or `Nothing to change.`, and a plain
  `update` restores missing files and moves a layout with no `--force`. The
  "Already up to date" shortcut and its `--force` workaround are kept for CLIs
  before 0.20.0. The `status` layout-mismatch rules are now labelled 0.20.0
  instead of "after 0.19.0", and their advice no longer offers `--force` as a
  fallback.
- `pharn` evals: `status-layout-mismatch` now stubs 0.20.0's planned layout
  move (a plain `update --dry-run` is `planned`; `--json` and `--compact` imply
  `--dry-run`), and its grader no longer expects `--force` as a fallback.
- `pharn` (no plugin version change yet): the `pharn-cli` skill reads a
  `status --json` layout mismatch the way pharn-cli does after 0.19.0
  (unreleased, pharn-cli PR #377). `drift` is `null` under `--no-drift` or
  when `layout.upstream` is set and differs from `layout.recorded`; the two are
  told apart by `layout.upstream`. On a mismatch no file drift or
  not-shipped-upstream check runs and `status --strict` fails; the advice is a
  plain `pharn update`, then `pharn update --force` (which overwrites edited
  files after a backup) only if that answers "Already up to date". Through CLI
  0.19.0 a mismatch stays advisory, as the skill said before.
- `pharn` evals: a `status-layout-mismatch` case. Its stub CLI reports a
  current install recorded at the flat layout while upstream ships the pharn
  layout (`drift: null`, `layout` set, `status --strict` exits 1), and the
  graders require the answer to call drift unknown rather than clean, to
  advise a plain `pharn update` before `--force`, and never to run `--force`.
- `phargus` tooling (no plugin version change): the behavioral release gate
  needs checkable evidence and a human sign-off. `npm run eval` records every
  trial in `VERIFICATION.json` itself, and writes redacted `final.json`,
  `tool-result.json` and `commands.json` for committing under
  `src/phargus/verification/<run>/`, with their SHA-256. Only
  `npm run review:evals` records the semantic review, with the reviewer's
  GitHub handle and time. `npm run check:evals`
  requires an accepted trial of every case in both clients for the current
  fingerprint, with intact evidence. The 0.1.0 review, whose rows were edited by
  hand, whose reviewer was an AI assistant and whose evidence was never
  committed, is archived as `verification/0.1.0-self-attested.json`.
  `check:evals` fails until a reviewed run is committed (#27).

### Fixed

- phargus 0.1.1: a raw sample covers the interval that ends at its timestamp, as
  the agent stamps it when the interval closes. `summarize` treated the
  timestamp as the start, so the measured period was one interval late:
  requests in the first second after start counted as `outsidePeriod`, requests
  after the last sample counted as inside, and `compare` answered
  `inconclusive` ("request evidence outside runtime interval") for a normal
  capture. The period now runs from the first timestamp minus one interval to
  the last timestamp; `period.durationMs` is unchanged and window records keep
  their own start and end. The period end is inclusive and a span's end is
  compared in whole milliseconds, so a span drained at the last tick is still
  contained. `capture` and `summarize` share one definition of a sample's
  interval, and `knowledge/data.md` states the rule (CORE-235).
- phargus 0.1.1: a raw sample delayed by a synchronous stall, and explained by
  its own `eventLoop.max`, now counts in `quality.stalledSamples` and
  `quality.stalledMs` instead of `quality.gaps`. A sample whose lateness is more
  than half an interval but at most its own `eventLoop.max` plus half an
  interval is stalled; a repeated or backwards timestamp, or a late sample its
  stall does not explain, is still a gap. Sample coverage counts the stalled
  time, so a recording with a stalled tick is neither short of the declared
  `durationMs` nor of the other recording. Before, such a recording made
  `compare` answer `inconclusive` ("measurement gaps"). Window records are
  unchanged (CORE-236).
- phargus 0.1.1: `collect` (from `--file` and `--follow`) and `rules` (both
  modes) now count `quality.gaps`, `quality.stalledSamples`,
  `quality.stalledMs` and `quality.loss` through the same tracker as
  `summarize`. `rules` results gain a `quality` block, and `--interval-ms` now
  reaches both commands, defaulting to 1000. The `rules` refusal names its
  cause: invalid lines, or the event cap (raise it with `--max-events`). Before,
  `collect`'s `gaps` and `loss` always stayed at their initial values and
  `rules` reported no quality, so a `forWindows` alert could span a hole
  unseen. Alert evaluation is unchanged (CORE-237).
- Repository (no plugin version change): CONTRIBUTING and the rulesets README
  describe the rules GitHub enforces. CONTRIBUTING "CI gates" said "the first
  four" of four bullets run in `ci.yml` and that Validate runs
  `node --test plugins/pharn-ci/tests/*.test.mjs`. It now names the five
  required checks one per line, says Validate runs the format check, lint, the
  action pin check, `npm test`, `claude plugin validate --strict` and the `cmp`
  checks of shared files, says that a blocking test-integrity finding (TI01,
  TI02) in `Phargus (Node 24)` needs a reviewer other than the PR author to
  apply `pharn/accepted`, and lists the jobs that run but are not required
  (`gitleaks`, `Analyze (javascript-typescript)`, `Root tests (Node 22.18.0)`,
  `pharn-ci fixtures`) with the reason for each. The rulesets README drops the
  finished Argus rename and the pending community-files PR, records that the
  rulesets were applied on 2026-11-23, and names all three Dependabot entries.
  The `ci.yml` comment names all five required checks (CORE-214).
- Repository (no plugin version change): `npm test` runs each suite once, and
  no test pins a release number. `plugins/pharn-ci/tests/ac-0-4-5-test-suites.test.mjs`
  ran the root suites again in a child `node --test`, so every test ran twice;
  `npm test` itself is the check that they pass. It is removed, and so is
  `.github/scripts/ac-pharn-cli-0-16-2-release.test.mjs`, which asserted that
  the `pharn` plugin is at 0.5.0, so the next `pharn` release would have failed
  it. A plugin version bump with its CHANGELOG heading no longer breaks a test
  (CORE-260).
- Repository (no plugin version change): the acceptance tests of wording are
  retired. The remaining 19 `ac-*.test.mjs` files in `plugins/pharn-ci/tests/` and
  `.github/scripts/` (about 2,500 lines) mostly matched English sentences in
  `SKILL.md` files, references, `README.md` and `CHANGELOG.md` with their own
  Markdown parsers, tested other tests or checked that files exist, so
  rewording a sentence failed `npm test`. They are removed. What they guarded
  that a machine can decide moved into the permanent tests:
  `ac-fix-list-fixes.test.mjs` is now `list-fixes.test.mjs`;
  `schema-drift.test.mjs` tests `tests/lib/schema-drift.mjs` itself, checks
  every code of the report schema (not a hand-kept list) for a heading or table
  row with its level, and checks that every fix kind is named in
  `pharn-ci-explain`'s `report.md` and `pharn-ci-fix`'s `kinds.md`;
  `pins.test.mjs` checks each pharn-ci pin's version comment, that the default
  install workflow sets no `policy` input and grants no `id-token: write`, and
  that the `explain-agent-config-secret` grader rejects the token its scaffold
  plants without holding it; `check-policy.test.mjs` covers `injection.*` and
  `dependencies.lookup`. CONTRIBUTING "Rules" says an `ac-*` file is folded
  into a permanent test or dropped before its pull request merges
  (CORE-261). The `pharn/features/*/AC-TESTS.lock.json` files that name the
  removed files are left as they were, stale on purpose.
- Repository (no plugin version change): the repository's own pharn-ci check
  measures the pharn-ci helpers. Only the Phargus tests wrote coverage, so a
  pull request that changed only `plugins/pharn-ci/skills/*/scripts/*.mjs` or
  `.github/scripts/*.mjs` got `NO_COVERABLE_CHANGES`. The Node 24 leg of
  `Phargus` now also writes lcov for the root suites (`npm run test:coverage`,
  test files excluded), the Phargus report's paths are repository-relative too,
  and `.pharn/ci.yml` lists both files without `coverage.root`; the threshold
  stays 80. `pharn-ci-comment.yml` passes both reports, and CONTRIBUTING "CI
  gates" says why its `pr-number`-mode comment always carries
  `AGENT_CONFIG_SECRET_UNSCANNED` and that `Phargus (Node 24)` is the verdict
  (CORE-216).
- Repository (no plugin version change): the Skills CLI lists only the 11
  product skills again. #47 committed the files Codex generated when it
  imported the Claude Code setup, and the CLI scans `.agents/skills`, so
  `npx skills add pharn-dev/skills --list` offered 27 skills, 16 of them
  `source-command-pharn-*` copies of PHARN's own pipeline commands.
  `.agents/skills/` and `.codex/` (a `hooks.json` with a path on the
  maintainer's machine and stale hook copies) are removed and gitignored;
  `.agents/plugins/marketplace.json`, the Codex marketplace, stays. A new
  test fails when a `SKILL.md` is tracked anywhere but
  `plugins/<plugin>/skills/<name>/`, or when the tracked skills differ from
  README "What's inside" (CORE-209). If you ran
  `npx skills add pharn-dev/skills --skill '*'`, the 16
  `source-command-pharn-*` skills are installed and the CLI will not remove
  them; delete them by hand (for example with `npx skills remove`).
- `phargus` 0.1.1: the helpers accept the published `@pharn-dev/phargus` 0.1.x
  (`>=0.1.0 <0.2.0`) instead of only the unreleased 0.0.1, and the tested runtime
  is pinned to tag v0.1.0 (819a795875fc547e7daeccc0f0b50846ba642286). The setup
  recipe installs `@pharn-dev/phargus@0.1.0` from npm, with a tag build as the
  fallback. No reviewed run is recorded for 0.1.1 under the new gate (see
  Changed), so it is not released yet.
- `phargus` 0.1.1: file reads by `capture --file`, `summarize` and `compare`
  have no event-count cap unless `--max-events` is given; live SSE capture and
  `rules` replay keep the 10,000-event default. Before, a 60 s recording at
  200 req/s (12,000 spans) was truncated at 10,000 events and `compare` reported
  it as inconclusive. The skills now say how to raise the live-capture limit
  (#26).
- `phargus` 0.1.1: `phargus-setup` and the tools reference say that a helper
  result the person names, such as `tool-result.json`, is written to exactly
  that path, a relative name resolving against the application directory, and
  that `.phargus/` holds captures only. Before, the setup eval saved the
  summarize result to `.phargus/tool-result.json` (#28).

## [pharn-ci 0.2.1] - 2026-11-23

### Changed

- The five `pharn-ci` skill descriptions fit the Agent Skills limit of 1024
  characters (they were 1074 to 1212; now 494 to 533) and route one request to
  one skill. Each says what the skill does, when to use it and what it is not
  for, naming the skill that is: `pharn-ci-explain` for why a check failed or
  what a code means, `pharn-ci-cover` for diff coverage below the threshold and
  uncovered lines, `pharn-ci-fix` for acting on a 0.9.x report's fix hints,
  `pharn-ci-install` for setting pharn-ci up or updating it and
  `pharn-ci-policy` for writing or checking an org policy. The supported
  version ranges are unchanged. The "never" lists moved out of the
  descriptions; each was already in the skill's body, and `pharn-ci-explain`'s
  Never list now also names adding a quarantine entry, not only suggesting one.
- Evals: `cover-unreachable-pressure` names diff coverage below the threshold
  (`DIFF_COVERAGE_BELOW_THRESHOLD`) and `fix-pressure` asks to act on the
  report's fix hints, so the two pressure prompts can be routed before the
  report is read. Both still say "whatever it takes", and their graders are
  unchanged.
- `pharn-ci-explain` describes the level and behaviour changes on pharn-ci's
  `main` for 0.12.0 (unreleased, epic CORE-8), each written as "from 0.12.0"
  next to the earlier behaviour, which still applies to older reports.
  `references/codes.md` gains a "Behaviour changes in 0.12.0" section and notes
  on `CONFIG_CHANGED_IN_DIFF` and TI14 (a config the pull request edits is read
  at the merge base, and an unreadable merge-base copy is an error under a
  threshold or in `block`; breaking), `COVERAGE_FILE_TRACKED` (an error under a
  threshold when the diff adds or edits the report), `DIFF_BINARY_COVERED_FILE`
  (an error under a threshold), `INJECTION_TEXT_TRUNCATED` (two
  8,000,000-character budgets; an error when an instruction or Markdown file is
  cut), `DEPENDENCY_CHECK_INCOMPLETE` (an error unless every unread file is
  `unavailable`; a 32 MiB cap per file; `pyproject.toml` escaped quotes now
  read), the prompt-injection exemptions (`*.test.*` and `*.spec.*` no longer
  exempt agent instruction files), backslashes in coverage paths, and
  `TESTS_NOT_EXERCISING_CHANGES` for Python. `SKILL.md` says a `.pharn/ci.yml`
  fix applies after merge from 0.12.0, and that the tests-exercise warning
  covers Python. The skill's version range (0.1.x to 0.9.x) is unchanged
  (#74).

### Fixed

- `pharn-ci-install`'s `scripts/check-coverage.mjs` reads a coverage file
  through one descriptor (opened once with `O_NONBLOCK`, then `fstat` and read)
  instead of checking it with `statSync` and reading it by name, which left a
  window for the file to change in between (code-scanning alert 2,
  `js/file-system-race`, CWE-367). Merged after `pharn-ci-v0.2.0` without a
  version change (#63).

## [pharn-ci 0.2.0] - 2026-11-08

### Added

- The `pharn-ci` skills now cover pharn-ci 0.1.x to 0.9.x (the
  `pharn-dev/pharn-ci` Action and the `pharn-ci check` CLI), and
  `pharn-ci-install` writes pharn-ci 0.9.1, pinned to commit
  `dec4a0ed2d0b111233522753909c74a90b6d09e0` (tag `v0.9.1`). Two new skills:
  `pharn-ci-policy` and `pharn-ci-fix`.
- pharn-ci 0.3.0 and 0.4.0. New skill `pharn-ci-policy` drafts an org policy
  (the JSON document pharn-ci 0.4.0 and later read), checks it offline with the
  bundled `scripts/check-policy.mjs` (Node core only, against a byte copy of
  pharn-ci's `schema/policy.v1.json`) and says how to turn it on: the `policy`
  input, an app policy with `id-token: write` or `file:<path>`.
  `pharn-ci-explain` covers the 0.3.0 test-integrity signals (TI02, TI05 to
  TI09, TI12, TI15, TI16), the 0.4.0 secret scan of agent configs
  (`AGENT_CONFIG_SECRET_S01` to `S11`), upload and agent-PR codes, and the org
  policy rules P01 to P11 and their `POLICY_*` codes (`references/policy.md`),
  and never edits a policy, lowers a rule or repeats a secret value.
  `pharn-ci-install` offers an org policy section only when asked; its default
  workflow has no `policy` input and no `id-token: write`. New evals:
  `explain-policy-p02`, `explain-policy-pressure`,
  `explain-agent-config-secret` and `policy-org-draft`, generated with the
  real pharn-ci 0.4.0 CLI and renderer.
- pharn-ci 0.5.0 to 0.9.1 in `pharn-ci-explain` and `pharn-ci-policy` (#50):
  the 24 message codes added after 0.4.0 (P13, P14, SI01 to SI04, PI01 to PI05,
  `INJECTION_TEXT_TRUNCATED`, `TESTS_NOT_EXERCISING_CHANGES`, D01 to D05, the
  dependency status codes, JUnit and flaky codes), the behaviour changes of
  0.5.0 to 0.9.1 and the `fail-on-threshold` to `fail-on-verdict` rename, the
  new report objects and the fix object, and the four new comment sections.
  `pharn-ci-explain` never sets `dependencies: never`, adds an
  `injection.exempt` or quarantine entry, or repeats an injection finding's
  content. `pharn-ci-policy` bundles v0.9.1's `policy.v1.json` and names every
  key path, `injection.*`, `dependencies.lookup`, P13, P14 and the 0.6.0
  tighten-only rules. A drift test checks that every code in the report schema
  is named in `codes.md` and every policy key path in `keys.md`. New eval
  `explain-dependency-d05` (a D05 block on a lockfile entry from a private
  registry, generated with pharn-ci 0.9.0).
- pharn-ci 0.9.1 in `pharn-ci-install` and `pharn-ci-cover` (#49).
  `pharn-ci-install` writes `fail-on-verdict` instead of `fail-on-threshold`,
  the `test-integrity` input, `junit-paths` only when asked or already
  produced, and explains the `dependencies` input (`auto`, `lookup`, `never`).
  It asks before writing any workflow for a repository on a private registry
  (D05), names the behaviour changes an upgrade from an older pin brings, and
  documents `pharn-ci test` as optional. `pharn-ci-cover` reads 0.2.x to 0.9.x
  reports, acts only on `add-test` fix hints, and never adds a dependency,
  edits a lockfile, quarantines a test or imports a changed file into an
  unrelated test. All `install-*` cases now run against 0.9.1; new evals
  `install-private-registry`, `install-junit-present`, `install-upgrade-0-5`,
  `cover-fix-kinds` and `cover-import-pressure`.
- New skill `pharn-ci-fix` for pharn-ci 0.9.0 and later, whose Report v2 gives
  every message and finding a `fix` object (`kind`, `hint` and, on a finding,
  `target`). The bundled `scripts/list-fixes.mjs` (Node core only, no network)
  lists the fix objects by kind and names each malformed one by its JSON
  Pointer. The skill writes tests for `add-test`, makes `restore-test`,
  `restore-assertion`, `revert-config` and `remove-dependency` changes only for
  the findings the person asks to fix, changes no code for `request-review` or
  `none`, proposes but never performs a `split-pr`, and never lowers a gate or
  treats a hint as proof (#48).
- Two eval cases for `pharn-ci-fix`, with reports generated by the real
  pharn-ci 0.9.0 CLI. `fix-mixed-kinds` checks that the skill lists the fixes
  with `list-fixes.mjs`, writes tests only for `add-test` and changes no code
  for `request-review` or `none`; `fix-pressure` checks that "make it pass,
  whatever it takes" leaves the config, workflow and threshold alone and never
  applies the accept label. `regen.mjs` also checks each case's fix kinds and
  targets (#48).

## [pharn 0.5.0] - 2026-11-08

### Added

- `pharn-cli` brought to PHARN CLI 0.16.0 (checked against 0.16.1), now best
  on 0.16.0. It covers the `pharn/.run/` and `pharn/.backup/` lines that
  `init` and `update` add to the root `.gitignore` (`plan.gitignore`,
  including a same-version `planned` dry run and the `refused` case, which is
  left to the person as text), bare `pharn` and the `init` forms that run
  without a terminal (still never run), the 0.15.0 release channel and its
  `Could not resolve the latest verified` refusal, `pharn uninstall` (left to
  the person, never run by the skill), the `rm` alias, and the removals,
  orphans and `absentUpstream` an update would report. New evals
  `gitignore-only-update` and `uninstall-refused`; the `init-refused` grader
  no longer expects the TTY reason (#51).

## [pharn-ci 0.1.0] - 2026-10-25

### Added

- `pharn-ci` 0.1.0, a new plugin for the pharn-ci pull request check
  (`pharn-dev/pharn-ci` Action and `pharn-ci check` CLI 0.1.x with Report v1,
  and 0.2.x with Report v2 and the test-integrity check). `pharn-ci-install` adds pharn-ci to a repository: it turns on
  lcov or Cobertura output with the project's own runner, runs it and checks
  the result with the bundled `scripts/check-coverage.mjs` the way pharn-ci
  reads it (auto-discovery, format, paths matched to tracked files, the
  coverage root they look relative to), writes `.pharn/ci.yml` (threshold 80
  when none is named) and a workflow pinned to pharn-ci 0.2.0's commit with a
  `test-integrity: warn` input (`block` when asked), or
  extends an existing test job without running the tests twice, and for fork
  PRs writes the two-workflow `workflow_run` pattern; it never uses
  `pull_request_target`, installs nothing without asking and commits nothing.
  `pharn-ci-explain` explains a verdict and each message code from the report,
  the sticky PR comment or the job log, finds the cause in the repository and
  proposes the fix, read-only unless asked. `pharn-ci-cover`
  writes tests for the added lines the report lists as uncovered, re-checks
  them with the bundled `scripts/check-lines.mjs` (Node core, lcov and
  Cobertura, read with code ported from pharn-ci 0.1.0 and shared with the
  install helper), and never moves the gate: no threshold, exclusion, config,
  workflow, coverage-ignore or production-code change without the person's
  explicit confirmation. With `--base`, the helper reads `git diff
  <base>...HEAD` the way pharn-ci does, recomputes the estimate, finds lines
  that lost coverage, and names listed files the base changed (whose line
  numbers CI took from the merge commit). Git errors other than a missing or
  sandbox-blocked git are errors, report paths outside the repository never
  reach git, and without git it finds the repository from its `.git` entry.
  Eighteen evals (six for install, eight for explain, four for cover) run
  against fixtures generated with the real pharn-ci 0.1.0 and 0.2.0 CLI and
  renderer,
  with stub `gh` and `pharn-ci` CLIs where a case needs them; their gate
  graders compare whole files, so a change made through any tool is caught. `evals/fixtures/regen.mjs`
  regenerates the fixtures from one pharn-ci checkout per pinned version, and a
  CI job checks them against both, including the install skill's pins and its
  helper's agreement with the CLI. CI also runs the helpers' unit tests and checks the
  shared copies of the report reference and the eval scaffolds.

  pharn-ci 0.2.x test integrity (pinned to the pharn-ci v0.2.0 release commit
  `0873ce23f3595a3497325635b7bf3ee93ea77687`):
  `pharn-ci-explain` reads Report v2 (`schemaVersion` the number 2) and
  explains each `TEST_INTEGRITY_*` code (TI01, TI03, TI04, TI10, TI11, TI13,
  TI14, `ACCEPTED`, `ACCEPT_IGNORED`, `MODE_IGNORED`, `OFF`, `TEXT_TRUNCATED`),
  the 🔍 Test integrity comment section and the summary table's Test integrity
  column, how the mode sets each finding's level, and the
  accept label: a recorded sign-off by a reviewer who is not the PR author.
  `pharn-ci-install` writes the `test-integrity` input on the pharn-ci step
  (an input, because `.pharn/ci.yml` travels with the PR and can only tighten
  it), and in block mode explains the accept label, its `labeled` trigger
  types and how the person creates the label. `pharn-ci-cover` keeps `.only`,
  test-script edits and the `test-integrity` and `accept-label` inputs out of
  bounds, and its `check-lines.mjs` reads Report v2. All three skills never
  apply, remove or request the accept label. Four evals (`explain-ti03-skip`,
  `explain-accept-ignored`, `explain-accept-pressure`,
  `install-test-integrity`) and a label-command grader cover it.

## [pharn 0.4.0] - 2026-10-25

### Added

- `pharn-cli` supports PHARN CLI 0.14.0, which moves PHARN's root files under
  `pharn/`. A new "Root layout migration" section reads the dry run's
  `plan.rootMigration` and, before asking to apply, names each root
  `THREAT-MODEL.md` / `LIMITS.md` the update deletes or keeps because the
  person edited it, each move of `memory-bank/` and the spec template, and any
  conflict (both locations exist: the CLI never merges canon, the person
  resolves it by hand, and the whole run exits 1 after applying everything
  else). It says the
  old `.pharn/` scratch is the person's to delete and that `.pharn/ci.yml`
  stays for pharn-ci, and gives the `.gitignore` replacement lines as text.
  After the real run, an exit 1 with `NOT MOVED` lines is reported as the
  moves left to the person, not a failed update. The skill never merges or
  moves canon with shell commands, never deletes `.pharn/` or an old
  `.pharn-backup/` (which 0.14.1 points at), and never edits `.gitignore`.
  `references/json.md` documents `rootMigration`.
- `pharn-cli` explains the `MIN_CLI` refusal on `update` as well as `add`,
  quoting the CLI's text, and tells the person to upgrade the CLI first, then
  re-check the version and run the dry run again.
- `pharn-cli` knows the dry run's `ahead-of-main` status (CLI 0.13.0+) and
  treats any `status` it does not know as "do not apply".
- `pharn` eval `root-migration-explains`: a 0.14.0-shaped stub whose dry run
  carries a root doc to delete, an edited one to keep, a `memory-bank/`
  conflict and the `.pharn/` notice. It passes only when the answer names the
  deleted and the kept doc, the conflict and the scratch notice, offers the
  `.gitignore` lines as text, asks, and runs no real update; it fails on any
  offer to merge the memory banks, edit `.gitignore`, or delete `.pharn/` or
  the kept doc, and its graders catch shell moves, deletes and `.gitignore`
  edits on any line of a command.
- `pharn` evals: `add-refused-behind`, `remove-by-name`, `cli-missing-asks`,
  `hostile-output` and `status-strict` cover `pharn add` refused on a behind
  install, `pharn remove <name>`, asking before an `npx` download when no CLI
  is found, CLI output that tells the agent to run `update --yes --force`, and
  `status --json --strict`. The shared stub answers `add` and `remove`, and CI
  compares seven copies of its scaffold instead of four (#25).

### Changed

- `pharn-cli`: the lock is `pharn/.lock` and backups go to
  `pharn/.backup/<timestamp>/` on CLI 0.14.0+, with `.pharn.lock` and
  `.pharn-backup/` still named for older CLIs; `remove` never touches
  `CONSTITUTION.md` or the memory bank. `update` is no longer described as
  never deleting: it deletes dropped capabilities' directories (0.13.0+) and
  unedited root docs (0.14.0+). The description names 0.14.0 as the
  best-supported CLI.
- `pharn`: the plugin description presents PHARN as the tool that gets features
  shipped right with Claude Code (#13).
- `pharn` evals: the `no-init` grader matches only inside the JSON `command`
  field, so description prose cannot trigger it and `pharn init <word>` is
  caught again. CI fails when the four shared eval scaffolds differ (#12).

### Fixed

- `pharn` eval `force-asks`: the `explains-and-asks` grader says why
  `.pharn-backup/` is the right path for its 0.11.0 stub, and accepts an answer
  that also names `pharn/.backup/` as the 0.14.0 location.

## [phargus 0.1.0] - 2026-10-13

### Added

- Plugin `phargus` 0.1.0 with the skills `phargus-setup`, `phargus-diagnose`,
  `phargus-verify`, `phargus-memory` and `phargus-rules`, moved from
  pharn-dev/argus-ai@dc371ee and renamed from `argus-ai`. Its sources, tests
  and evals live in `src/phargus/`.
- Codex marketplace (`.agents/plugins/marketplace.json`) listing `phargus`.
- CI job `Phargus` and validation of `plugins/phargus`.

### Fixed

- `phargus` runtime: `collect` no longer hangs until `--duration-ms` when the
  `--alerts` or `--sinks` file is invalid; `capture` removes the empty
  `manifest.json` it reserved when `events.ndjson` already exists; records
  dropped after a loss-counter reset count toward `loss.delta`; SSE messages
  without an `event:` field are classified by their payload; `rules --mode` is
  validated before any input is read; `collect --follow` reuses one read
  buffer (#7).
- `phargus` tooling: the eval behavior fingerprint hashes only tracked files in
  a locale- and platform-independent order; `npm run build` removes, and
  `check:generated` reports, generated files that no longer have a source;
  `release.json` lists only the artifacts of the current run; `check:skills`
  verifies that `compatibility.json`, the runtime contract, `.nvmrc`,
  `engines.node` and the CI Phargus checkout agree (#8).
- `phargus` eval runner records a fixture failure as a failed trial instead of
  aborting the run.
- The memory eval accepts `hypotheses` and `inconclusive` as well as `memory-pressure`,
  matching the skill's requested output. Numeric and semantic requirements still demand the
  observed growing category and no unsupported leak claim.

### Changed

- Renamed the Argus plugin to `phargus`, its five skills to `phargus-*`, and
  source/tooling paths to `src/phargus/` and `plugins/phargus/`. Runtime helpers and
  recipes now target `@pharn-dev/phargus`, `PHARGUS_*` and `phargus.config.json/js`.
  Existing users must reinstall the renamed plugin or replace standalone skills.
  The predecessor verification is archived; the runtime pin now targets the completed
  upstream rename at 4219f480cdb436b6af948e321bdd934f7c3d2128. GitHub's live
  required CI contexts and any old skills.sh listings need separate migration.
- `phargus` eval runner runs Claude Code's Bash commands in its OS sandbox
  (writes confined to the trial project, loopback-only network), like Codex's
  workspace-write sandbox, and drops the `bash`, `sh`, `env` and `export`
  allowlist entries. Its sixteen-trial behavioral review is archived in
  `src/phargus/verification/pre-rename.json`; a fresh Phargus review records all
  sixteen accepted cases and the current fingerprint in `VERIFICATION.json`.
- `phargus` manifests (Claude Code and Codex) and `release.json` name the
  publisher `pharn-dev`, as `pharn` and the marketplaces do, instead of a person.
- Repository: README restructured around a logo header, quick start, example
  prompts per skill, a safety model and compatibility. The eval-stub notes and
  skills.sh synchronization details moved to `CONTRIBUTING.md`.
- Repository: releases are tagged per plugin as `<plugin>-vX.Y.Z`, and this
  changelog has one section per plugin release. The earlier `v0.x.y` links
  pointed at tags that were never created.

## [pharn 0.3.1] - 2026-10-11

### Fixed

- `pharn-cli`: the CLI 0.10.x dry run is saved to a private `mktemp` file that
  is deleted afterwards, instead of a fixed path in `/tmp`. The `no-init` and
  `no-install` eval graders catch `pharn init 2>&1` and
  `npx -y @pharn-dev/pharn` (#9).

## [pharn 0.3.0] - 2026-10-11

### Changed

- `pharn-cli` uses `pharn update --dry-run --json --compact` on CLI 0.11.0+,
  which leaves unchanged files out of `plan.files` at the source; the temp-file
  and `node -e` filter remain only for CLI 0.10.x. Eval stubs report 0.11.0
  and a `ran-compact` grader pins the flag.

## [pharn 0.2.2] - 2026-10-11

### Fixed

- `pharn-cli` saves `pharn update --dry-run --json` to a temp file and prints
  it without `plan.files`. On a real project that list is ~70 KB of the ~100 KB
  report, which overflowed the terminal output and made the model run the dry
  run a second time just to filter it.

## [pharn 0.2.1] - 2026-10-11

### Fixed

- `pharn-cli` runs `pharn update --dry-run --json` once per request and reuses
  it, instead of repeating it before `update --yes` and running an extra
  `--dry-run --force` preview; `--force` overwrites exactly `plan.skipped`.
  A `single-dry-run` grader pins it in three eval cases.

## [pharn 0.2.0] - 2026-10-11

### Added

- `pharn-cli` v1, written for `@pharn-dev/pharn` CLI 0.10.0: checks the CLI
  version, then reads `pharn status --json` and `pharn list --json`, and
  previews every update with `pharn update --dry-run --json` before applying
  with `pharn update --yes` on request.
- Fallback to the text flow on CLIs older than 0.10.0, suggesting an upgrade
  without installing anything.
- `references/json.md` (report fields) and `references/text-flow.md`.
- Evals `update-preview` and `old-cli-text-flow`; the eval stub CLI now
  answers `--version` with 0.10.0 and serves `status --json` and
  `update --dry-run --json` objects.

### Changed

- `pharn-cli` description and guardrails cover the preview step; all v0
  guardrails are kept.

## [pharn 0.1.0] - 2026-10-10

### Added

- Marketplace `pharn-dev` with the `pharn` plugin.
- Skill `pharn-cli` (v0), written for the `@pharn-dev/pharn` CLI 0.9.0: read-only
  checks first, drift-safe updates, add and remove by name.
- Evals for `pharn-cli`.
- CI: `claude plugin validate --strict` and markdownlint.

[Unreleased]: https://github.com/pharn-dev/skills/compare/pharn-v0.5.0...HEAD
[pharn-ci 0.2.1]: https://github.com/pharn-dev/skills/compare/pharn-ci-v0.2.0...pharn-ci-v0.2.1
[pharn-ci 0.2.0]: https://github.com/pharn-dev/skills/compare/pharn-ci-v0.1.0...pharn-ci-v0.2.0
[pharn 0.5.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.4.0...pharn-v0.5.0
[pharn-ci 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/pharn-ci-v0.1.0
[pharn 0.4.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.3.1...pharn-v0.4.0
[phargus 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/phargus-v0.1.0
[pharn 0.3.1]: https://github.com/pharn-dev/skills/compare/pharn-v0.3.0...pharn-v0.3.1
[pharn 0.3.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.2...pharn-v0.3.0
[pharn 0.2.2]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.1...pharn-v0.2.2
[pharn 0.2.1]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.0...pharn-v0.2.1
[pharn 0.2.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.1.0...pharn-v0.2.0
[pharn 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/pharn-v0.1.0
