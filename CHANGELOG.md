# Changelog

All notable changes to this repository are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and plugins follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Plugin `argus` 0.1.0 with the skills `argus-setup`, `argus-diagnose`,
  `argus-verify`, `argus-memory` and `argus-rules`, moved from
  pharn-dev/argus-ai@dc371ee and renamed from `argus-ai`. Skill content is
  unchanged. Its sources, tests and evals live in `src/argus/`.
- Codex marketplace (`.agents/plugins/marketplace.json`) listing `argus`.
- CI job `Argus` and validation of `plugins/argus`.

### Fixed

- `argus` runtime: `collect` no longer hangs until `--duration-ms` when the
  `--alerts` or `--sinks` file is invalid; `capture` removes the empty
  `manifest.json` it reserved when `events.ndjson` already exists; records
  dropped after a loss-counter reset count toward `loss.delta`; SSE messages
  without an `event:` field are classified by their payload; `rules --mode` is
  validated before any input is read; `collect --follow` reuses one read
  buffer (#7).
- `argus` tooling: the eval behavior fingerprint hashes only tracked files in
  a locale- and platform-independent order; `npm run build` removes, and
  `check:generated` reports, generated files that no longer have a source;
  `release.json` lists only the artifacts of the current run; `check:skills`
  verifies that `compatibility.json`, the runtime contract, `.nvmrc`,
  `engines.node` and the CI Argus checkout agree (#8). The recorded
  fingerprint in `VERIFICATION.json` needs a new behavioral review.
- `argus` eval runner records a fixture failure as a failed trial instead of
  aborting the run.
- `pharn-cli` 0.3.1: the CLI 0.10.x dry run is saved to a private `mktemp`
  file that is deleted afterwards, instead of a fixed path in `/tmp`. The
  `no-init` and `no-install` eval graders catch `pharn init 2>&1` and
  `npx -y @pharn-dev/pharn` (#9).

### Changed

- `argus` eval runner runs Claude Code's Bash commands in its OS sandbox
  (writes confined to the trial project, loopback-only network), like Codex's
  workspace-write sandbox, and drops the `bash`, `sh`, `env` and `export`
  allowlist entries. A new sixteen-trial behavioral review records the current
  fingerprint in `VERIFICATION.json`.

## [0.3.0] - 2026-10-11

### Changed

- `pharn-cli` uses `pharn update --dry-run --json --compact` on CLI 0.11.0+,
  which leaves unchanged files out of `plan.files` at the source; the temp-file
  and `node -e` filter remain only for CLI 0.10.x. Eval stubs report 0.11.0
  and a `ran-compact` grader pins the flag.

## [0.2.2] - 2026-10-11

### Fixed

- `pharn-cli` saves `pharn update --dry-run --json` to a temp file and prints
  it without `plan.files`. On a real project that list is ~70 KB of the ~100 KB
  report, which overflowed the terminal output and made the model run the dry
  run a second time just to filter it.

## [0.2.1] - 2026-10-11

### Fixed

- `pharn-cli` runs `pharn update --dry-run --json` once per request and reuses
  it, instead of repeating it before `update --yes` and running an extra
  `--dry-run --force` preview; `--force` overwrites exactly `plan.skipped`.
  A `single-dry-run` grader pins it in three eval cases.

## [0.2.0] - 2026-10-11

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

## [0.1.0] - 2026-10-10

### Added

- Marketplace `pharn-dev` with the `pharn` plugin.
- Skill `pharn-cli` (v0), written for the `@pharn-dev/pharn` CLI 0.9.0: read-only
  checks first, drift-safe updates, add and remove by name.
- Evals for `pharn-cli`.
- CI: `claude plugin validate --strict` and markdownlint.

[Unreleased]: https://github.com/pharn-dev/skills/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/pharn-dev/skills/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/pharn-dev/skills/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/pharn-dev/skills/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/pharn-dev/skills/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pharn-dev/skills/releases/tag/v0.1.0
