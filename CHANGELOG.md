# Changelog

All notable changes to this repository are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and plugins follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each plugin is versioned and released on its own. A release heading names the
plugin and its version, and its tag is `<plugin>-vX.Y.Z`, for example
`pharn-v0.3.1` or `phargus-v0.1.0`. Releases up to `pharn` 0.3.0 predate
`phargus` and cover only `pharn`. See [Releasing](CONTRIBUTING.md#releasing).

## [Unreleased]

### Changed

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

[Unreleased]: https://github.com/pharn-dev/skills/compare/pharn-v0.4.0...HEAD
[pharn-ci 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/pharn-ci-v0.1.0
[pharn 0.4.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.3.1...pharn-v0.4.0
[phargus 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/phargus-v0.1.0
[pharn 0.3.1]: https://github.com/pharn-dev/skills/compare/pharn-v0.3.0...pharn-v0.3.1
[pharn 0.3.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.2...pharn-v0.3.0
[pharn 0.2.2]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.1...pharn-v0.2.2
[pharn 0.2.1]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.0...pharn-v0.2.1
[pharn 0.2.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.1.0...pharn-v0.2.0
[pharn 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/pharn-v0.1.0
