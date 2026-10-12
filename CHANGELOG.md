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

- `pharn`: the plugin description presents PHARN as the tool that gets features
  shipped right with Claude Code (#13).
- `pharn` evals: the `no-init` grader matches only inside the JSON `command`
  field, so description prose cannot trigger it and `pharn init <word>` is
  caught again. CI fails when the four shared eval scaffolds differ (#12).

### Fixed

- `phargus` 0.1.1: the helpers accept the published `@pharn-dev/phargus` 0.1.x
  (`>=0.1.0 <0.2.0`) instead of only the unreleased 0.0.1, and the tested runtime
  is pinned to tag v0.1.0 (819a795875fc547e7daeccc0f0b50846ba642286). The setup
  recipe installs `@pharn-dev/phargus@0.1.0` from npm, with a tag build as the
  fallback. The 0.1.1 behavioral review is pending, so it is not released yet.

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

[Unreleased]: https://github.com/pharn-dev/skills/compare/pharn-v0.3.1...HEAD
[phargus 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/phargus-v0.1.0
[pharn 0.3.1]: https://github.com/pharn-dev/skills/compare/pharn-v0.3.0...pharn-v0.3.1
[pharn 0.3.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.2...pharn-v0.3.0
[pharn 0.2.2]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.1...pharn-v0.2.2
[pharn 0.2.1]: https://github.com/pharn-dev/skills/compare/pharn-v0.2.0...pharn-v0.2.1
[pharn 0.2.0]: https://github.com/pharn-dev/skills/compare/pharn-v0.1.0...pharn-v0.2.0
[pharn 0.1.0]: https://github.com/pharn-dev/skills/releases/tag/pharn-v0.1.0
