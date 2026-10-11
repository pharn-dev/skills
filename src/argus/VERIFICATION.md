# Verification — 0.1.0

Current status: verified on 2026-10-11 as plugin `argus` in pharn-dev/skills (shipped in
plugins/argus, sources in src/argus), at commit e8b870c. Deterministic checks, plugin
installation in both clients and the sixteen-case behavioral gate pass, and
npm run check:evals reports releaseReady: true for the fingerprint in VERIFICATION.json.
Semantic review was performed by Claude Code (claude-opus-5-5), delegated by the
maintainer, against the rubric in evals/README.md.

## Move to pharn-dev/skills

The plugin moved from pharn-dev/argus-ai@dc371ee and was renamed from argus-ai to argus
(argus@pharn-dev, /argus:argus-*). Skill content, references and helpers are
byte-identical: recomputing the fingerprint with the old plugin path reproduces the
value reviewed for argus-ai. Only the plugin manifests changed (name, homepage,
repository, Codex display name). The rename changes the hashed path and the Claude
invocation, so all sixteen trials were rerun.

Deterministic checks in the new location: 32 unit and 15 integration tests passed with
none skipped; format, generated files, skill metadata, lint, typecheck and the package
check pass; the built Argus tarball has the SHA-256 below. claude plugin validate
--strict passes for the marketplace and both plugins of the repository.

Installation from the skills checkout into throwaway configuration directories: Claude
Code installs argus@pharn-dev and pharn@pharn-dev, with all five argus SKILL.md files and
none of the src/argus tooling. Codex reads .agents/plugins/marketplace.json, installs
argus@pharn-dev, and codex debug prompt-input lists the five argus:argus-* skills and no
pharn skill.

### Behavioral rerun

| Scenario                | Codex            | Claude Code      |
| ----------------------- | ---------------- | ---------------- |
| Setup and restart       | Passed, reviewed | Passed, reviewed |
| Incident diagnosis      | Passed, reviewed | Passed, reviewed |
| Fix verification        | Passed, reviewed | Passed, reviewed |
| Memory growth           | Passed, reviewed | Passed, reviewed |
| Rules and replay        | Passed, reviewed | Passed, reviewed |
| Missing data            | Passed, reviewed | Passed, reviewed |
| Incomplete SSE evidence | Passed, reviewed | Passed, reviewed |
| Percentile semantics    | Passed on rerun  | Passed, reviewed |

Same configuration as the argus-ai review: Codex used its built-in default model with
--clean-codex, Claude Code its configured default, a 360-second bound per trial, run
sequentially on Node 24.13.1.

The first Codex percentile trial reported the 100 ms maximum and the 90 ms maximum sample
p99 and refused a global p99, but labelled its verdict connected, the setup case's label.
That fails the automatic verdict check. A single rerun returned inconclusive with the
same numbers and reasoning and passed. The failed trace is preserved; no response was
fabricated or edited.

Semantic review found no critical failures. Both setup trials saved app-owned recipes
over tools copied into .argus/tools, with no plugin or plugin-cache path in package.json
or the verification script, verified windows and incoming spans, and restarted from the
saved recipe. Diagnosis kept the 400 ms tail as hypotheses without attributing it to CPU
or a dependency. Verification named the 100 versus 60 request mismatch and the duration
mismatch and stayed inconclusive. Memory separated flat heap from external and
array-buffer growth without calling it a leak. Rules used strict > 50,000,000 ns for two
windows, fired at 3000-4000, resolved at 4000-5000 and stayed silent on normal data.
Missing data stayed insufficient evidence with a capture recipe. SSE kept loss unknown
and call sites and external memory unavailable.

An additional Claude Code run by the maintainer (evals/results/2026-10-11T00-23-42-150Z)
also passed all eight automatic checks; its Codex half was blocked because it ran
without --clean-codex. Raw transcripts are local under
evals/results/release-0.1.0-argus/ and
evals/results/release-0.1.0-argus-codex-percentile-rerun/, excluded from archives.

## Earlier record: argus-ai 0.1.0

Verified on 2026-10-10 at pharn-dev/argus-ai commit d681208. The sections below record
the verification of the same content as argus-ai, before the move. Their result paths
refer to the argus-ai checkout.

## Deterministic verification

| Check                               | Result                                    |
| ----------------------------------- | ----------------------------------------- |
| Data, comparison and HTTP/SSE tests | 32 passed                                 |
| Pinned Argus tarball integration    | 15 passed                                 |
| GitHub Actions on main              | passed on Node 22.18.0 and 24 for each PR |
| Lint, typecheck, format, generated  | pass                                      |
| Skill metadata and copied packages  | pass                                      |
| claude plugin validate              | pass for the marketplace and the plugin   |

Integration covers actual CJS/ESM preload, samples and incoming spans, collector/dashboard
SSE, bounded follow/cleanup, real V8 snapshots and analyzer workers, threshold/equality
and firing/resolved behavior, native sandbox rules, missing-peer failure exit codes,
standalone skill package resolution, file-sink alert delivery and the dashboard's
allowed-host policy. Both suites have zero skipped tests.

Tested Argus commit: a69d644383efe19c82fb3cfdee83a0ad1dd5e0f9. Built tarball SHA-256:
372c3c6f864205dcc393246971a8e28f0be9752a747bb56d41ac55674d703aee.
The original Argus checkout was not edited.

## Plugin installation

Both clients were installed from a checkout into throwaway configuration directories,
leaving user settings unchanged. Codex: codex plugin marketplace add, then codex plugin add
argus-ai@pharn-dev; codex debug prompt-input lists all five argus-ai:argus-* skills.
Claude Code: claude plugin marketplace add, then claude plugin install argus-ai@pharn-dev;
all five SKILL.md files are installed and the plugin is enabled.

Before 0.1.0 the plugin sat at the repository root, and Codex silently dropped the
marketplace, so codex plugin add failed with "plugin not found". A symlinked
subdirectory installed an empty plugin. The plugin now lives in plugins/argus-ai/, and
check:skills rejects a root plugin path or symlinks in the plugin directory.

## Changes since the draft review

- Claude's eval allowlist now permits starting, exercising and stopping the temporary
  application. Earlier setup trials wrote correct recipes but were denied at process start.
- summarize reports requests.routes and requests.distinctRoutes, and resolves the raw
  sampling interval from the flag, the capture manifest, declared conditions, then 1000.
  A median sample spacing outside 5% of that interval makes compare inconclusive.
- collect accepts --sinks for file/webhook alert delivery and --allowed-host for proxy
  names; the rules and setup references describe alert delivery and the 421 host policy.
- The plugin moved into plugins/argus-ai/ so Codex can install it.

## Behavioral verification

| Scenario                | Codex            | Claude Code      |
| ----------------------- | ---------------- | ---------------- |
| Setup and restart       | Passed, reviewed | Passed, reviewed |
| Incident diagnosis      | Passed on rerun  | Passed, reviewed |
| Fix verification        | Passed, reviewed | Passed, reviewed |
| Memory growth           | Passed, reviewed | Passed, reviewed |
| Rules and replay        | Passed, reviewed | Passed, reviewed |
| Missing data            | Passed, reviewed | Passed, reviewed |
| Incomplete SSE evidence | Passed, reviewed | Passed, reviewed |
| Percentile semantics    | Passed, reviewed | Passed, reviewed |

Codex used its built-in default model with --clean-codex, because the configured
gpt-6.1-sol alias is rejected for a ChatGPT account. Claude Code used its configured
default. Every trial used a 360-second bound and ran sequentially on Node 24.13.1.

The first Codex diagnosis trial wrote its own report to tool-result.json and the raw
helper summary to summary.json. That breaks the artifact contract, so it failed the
automatic check even though its analysis was sound. A single rerun saved the helper
summary and passed. The failed trace is preserved; no response was fabricated or edited.

Semantic review found no critical failures. Both setup trials left app-owned recipes with
no skill or plugin path, verified real windows and incoming spans, and restarted from the
saved scripts. Claude's setup used requests.routes to report two routes. Diagnosis kept
request-level waiting as a hypothesis and did not attribute the 400 ms tail to CPU or a
dependency. Verification named the 100 versus 60 request mismatch and the declared
duration mismatch. Memory separated flat heap from external and array-buffer growth
without calling it a leak. Rules used strict > 50,000,000 ns for two windows, fired at
3000, resolved at 4000 and stayed silent on normal data; both responses mentioned sinks
for delivery. Missing data stayed insufficient evidence with a capture recipe. SSE kept
loss unknown and hotspots and external memory unavailable. Percentile reported the 100 ms
maximum and 90 ms maximum sample p99 and refused a global p99.

Raw transcripts and helper artifacts are local under evals/results/release-0.1.0-final/
and evals/results/release-0.1.0-final-codex-diagnose-rerun/, excluded from archives.
Earlier draft trials remain as historical evidence in their existing local directories.

## Release

npm run check:evals passes. Rerun affected trials after any change to runtime/,
knowledge/, the shipped skills, catalog.json or compatibility.json, because the behavior
fingerprint changes. Tag and publish manually; no npm or plugin directory publication
is part of ordinary edits.
