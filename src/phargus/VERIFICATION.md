# Verification — Phargus

## 0.1.1: behavioral review pending

Current status: deterministic checks and integration pass; the behavioral release
gate is not met. npm run check:evals reports releaseReady: false because the
shipped helpers and references changed after the 0.1.0 review below. VERIFICATION.json
still holds that 0.1.0 review unchanged. Run a fresh sixteen-trial review before
the next release.

0.1.1 repins the tested runtime to the published release: tag v0.1.0, commit
819a795875fc547e7daeccc0f0b50846ba642286, @pharn-dev/phargus 0.1.0. The helpers
now accept installed versions >=0.1.0 <0.2.0 instead of exactly 0.0.1, and the setup
reference installs from npm, with a v0.1.0 tag build as the fallback.
The old pin 4219f480 has the same tree as the upstream squash merge 3831198.
From there to v0.1.0, upstream changed only release packaging, workflows and
documentation, plus the package version and the removal of "private": true.
Nothing under src/ or test/ changed.

Checked on 2026-10-13 with Node 22.18.0 and 24.13.1:

- 43 unit tests and 15 integration tests passed on each version, with none skipped.
  The integration build of the tag was verified against the local v0.1.0 tag; its
  tarball SHA-256 is b6d893d1b8124185f9660a9a00ec9d0205afd3e6e7fd51e5277a43bb02b81f16.
- The files of @pharn-dev/phargus 0.1.0 installed from npm are byte-identical to
  that tag build. The 15 integration tests also passed against the npm-installed
  package on Node 24.13.1.
- Format, lint, typecheck, generated resources, skill metadata, copied packages,
  Markdown lint and claude plugin validate --strict passed.

## 0.1.0: reviewed release

Status at 0.1.0: deterministic checks and all sixteen reviewed behavioral cases
passed after the full Argus-to-Phargus rename on 2026-10-11.
The prior sixteen model trials verify the predecessor package and identifiers.
They do not establish compatibility with @pharn-dev/phargus, PHARGUS_* or
phargus.config.json/js, and their fingerprint has not been reused.

The original records remain unchanged in
[pre-rename.md](verification/pre-rename.md) and
[pre-rename.json](verification/pre-rename.json). Old names and paths there identify
historical evidence, including the raw artifacts in the original checkout.

## Local deterministic verification

Checked on Node 24.13.1 with the dependency versions from main:

- 39 unit tests passed with none skipped, including scoped package resolution,
  the renamed config filename and the --phargus-package CLI option.
- 12 skills.sh change-detection tests passed.
- Format, lint, typecheck, generated resources, skill metadata and copied packages passed.
- Claude Code validates the marketplace and both plugins; Markdown lint passed on 85 files.
- The original review files are preserved byte-for-byte. Remaining Argus references
  identify historical evidence or explain migration from the old installation.

The bundled skill-creator validator rejects the pre-existing compatibility frontmatter
field; the repository's check:skills accepts and validates that field's skill metadata.

## Upstream integration

compatibility.json, runtime/upstream.mjs and .github/workflows/ci.yml pin the
completed upstream rename at 4219f480cdb436b6af948e321bdd934f7c3d2128:
@pharn-dev/phargus 0.0.1 with PHARGUS_* and phargus.config.json/js.
prepare:integration checks the source package identity and version before building.

All 15 integration tests pass on Node 24.13.1, with none skipped. They cover actual
CJS/ESM preload, samples and incoming spans, collector/dashboard SSE, bounded
follow and cleanup, real V8 snapshots/analyzer workers, threshold equality and
firing/resolved edges, native sandbox rules, missing-peer failures, standalone
package resolution, alert sinks and dashboard allowed-host behavior.

The tarball SHA-256 is
a28d26f65b39acdd09e02687f9b8dead661b91e987a40e3ff7f4658578023ccf.
The local build used --reuse-dependencies from the upstream checkout, with its
native isolated-vm peer confirmed compatible with Node 24.13.1. CI installs fresh
dependencies and repeats the suite on Node 22.18.0 and 24.

## Behavioral release gate

All eight cases pass in both Codex and Claude Code, with semantic review by the
Codex assistant in this chat against evals/README.md. The saved final responses
and actual helper artifacts were reviewed; VERIFICATION.json records the current
shipped-content fingerprint and npm run check:evals reports releaseReady: true.

| Scenario                | Codex                                       | Claude Code                                 |
| ----------------------- | ------------------------------------------- | ------------------------------------------- |
| Setup and restart       | Passed, reviewed                            | Passed, reviewed                            |
| Incident diagnosis      | Passed on rerun, reviewed                   | Passed, reviewed                            |
| Fix verification        | Passed, reviewed                            | Passed, reviewed                            |
| Memory growth           | Passed after rubric clarification, reviewed | Passed after rubric clarification, reviewed |
| Rules and replay        | Passed, reviewed                            | Passed, reviewed                            |
| Missing data            | Passed, reviewed                            | Passed, reviewed                            |
| Incomplete SSE evidence | Passed, reviewed                            | Passed, reviewed                            |
| Percentile semantics    | Passed, reviewed                            | Passed, reviewed                            |

Codex used its built-in default with --clean-codex in its workspace-write sandbox;
Claude used its configured default, claude-sonnet-5-5, with every Bash command in
Claude Code 2.1.295's OS sandbox. Trials ran sequentially on Node 24.13.1 with a
360-second bound per trial.

The first Codex diagnosis trial saved the helper summary as phargus-summary.json
and an explanatory report as tool-result.json, failing the artifact contract.
A fresh rerun saved the required helper JSON and passed. No failed response was edited.

Two Claude memory attempts returned hypotheses, and one later Codex memory attempt
returned inconclusive, while correctly identifying external/ArrayBuffer growth and
keeping a leak unproven. The earlier memory grader rejected those coarse labels.
The clarified rubric accepts memory-pressure, hypotheses or inconclusive; numeric
assertions still require flat heapUsed and rising external memory, and semantic
review still requires the growing category and no unsupported leak claim. Fresh
memory trials in both clients passed this rubric. All earlier attempts are retained.

Review found no critical rubric failures in the accepted runs. Minor limitations:
Claude's diagnosis did not explicitly contrast identical signals in fast and slow
periods; its SSE follow-up overstated enabling memory fields and heap diffs for
external memory; its memory follow-up suggested finding buffer owners with a heap
diff. The helper reports object counts and self sizes, without retaining paths or
owner attribution. These limits remain explicit in the shipped references.

Raw transcripts and artifacts remain ignored under evals/results/phargus-rename-2026-10-11/,
evals/results/phargus-rename-codex-diagnose-rerun/,
evals/results/phargus-rename-claude-memory-rerun/,
evals/results/phargus-rename-memory-verdict-review/ and
evals/results/phargus-rename-memory-verdict-final/. They are excluded from release archives.

## Migration outside this checkout

- Existing plugin users must uninstall argus@pharn-dev and install phargus@pharn-dev.
  Replace standalone `argus-*` skills with the corresponding `phargus-*` directories.
- Migrate application imports, PHARGUS_* variables, configuration filenames and
  application-owned .phargus/ recipes together with the renamed runtime.
- The versioned ruleset requires Phargus (Node 22.18.0) and Phargus (Node 24).
  A live-rule read on 2026-10-11 showed only Validate and Markdown lint required.
  Apply the versioned target separately if the additional checks should be enforced.
- The skills.sh sync workflow requests new listings after merge; it cannot remove
  old argus-* listings. Public plugin-directory listings also need separate updates.
- Tag and publish manually after deterministic checks and the model gate pass.
