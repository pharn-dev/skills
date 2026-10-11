# Verification — 0.1.0

> **Pending rerun.** The plugin moved from pharn-dev/argus-ai@dc371ee into
> pharn-dev/skills (plugins/argus, sources in src/argus) and was renamed from argus-ai
> to argus. Skill content, references and helpers are byte-identical; recomputing the
> fingerprint with the old plugin path reproduces the reviewed value. The rename changes
> the hashed path and the Claude invocation (/argus:...), so npm run check:evals is
> blocked until the sixteen trials are rerun and reviewed. Deterministic checks pass in
> the new location (32 unit, 15 integration, 0 skipped). The record below is for 0.1.0
> as argus-ai.

Verified on 2026-10-10 at pharn-dev/argus-ai commit d681208. Deterministic checks, plugin
installation in both clients and the sixteen-case behavioral gate pass.
npm run check:evals reports releaseReady: true for the shipped-content fingerprint in
VERIFICATION.json. Semantic review was performed by Claude Code (claude-opus-5-5),
delegated by the maintainer, against the rubric in evals/README.md.

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
