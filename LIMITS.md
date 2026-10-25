# Compatibility and Limits

## Tested combinations

| Plugin | Agent coverage | Tool contract and evidence |
| ------ | -------------- | -------------------------- |
| `pharn` | Claude Code; development instructions verified with 2.1.295. Codex behavior has not been verified. | The [skill](plugins/pharn/skills/pharn-cli/SKILL.md) targets PHARN CLI 0.10.0+ and describes a 0.9.x fallback. Its [evals](plugins/pharn/evals/) use a stub CLI, including 0.10.0-shaped output and an older text flow. They do not establish compatibility with every real CLI release. |
| `pharn-ci` | Claude Code; not yet verified with recorded eval runs. Codex behavior has not been verified. | The [skills](plugins/pharn-ci/skills/) target pharn-ci 0.1.x (Report v1) and 0.2.x (Report v2, test integrity); `pharn-ci-install` writes 0.2.0. 0.2.0 is pinned to commit `feb9cae` on pharn-ci's main until its tag exists. Their [evals](plugins/pharn-ci/evals/) replay reports, comments and CLI output generated with the real pharn-ci CLI and renderer at the pinned 0.1.0 and 0.2.0 commits, through stub `gh` and `pharn-ci` executables where a case needs them. Accept-label results come from pharn-ci core's own functions applied to the stub's label events. They do not exercise a real GitHub API, a real Action run, or later pharn-ci releases. |
| `phargus` | Targets Codex and Claude Code. No behavioral review is recorded for the current content; the 0.1.0 and predecessor reviews are archived as self-attested. See the [verification record](src/phargus/VERIFICATION.md). | The tested runtime release (tag and commit), the accepted package versions, and the minimum Node version are in [compatibility.json](src/phargus/compatibility.json). CI targets Node 22.18.0 and 24. |

The runtime is `@pharn-dev/phargus`, published on npm. The skills are tested against
0.1.0 (tag v0.1.0); the helpers accept `>=0.1.0 <0.2.0`, so a later 0.1.x patch is
accepted without having been tested here. Follow the
[tested installation contract](src/phargus/knowledge/compatibility.md). Runtime checks establish exports
and package version, but do not authenticate the source commit of an
installed package.

Skills CLI discovery and installation into an agent directory do not establish
behavioral compatibility with that agent. In particular, the `pharn` plugin is
not listed in the Codex marketplace while its Codex behavior remains unverified.

## What verification establishes

Deterministic CI checks validate the marketplaces, Markdown, generated Phargus
files, metadata, formatting, types, unit tests, and pinned-source integration
tests. Behavioral evals are separate and require model credentials. For `phargus`,
the eval runner writes each trial into the
[verification metadata](src/phargus/VERIFICATION.json) with redacted evidence committed
under `src/phargus/verification/`, and a maintainer signs off each trial under their
GitHub handle. `npm run check:evals` passes only when every case has a signed-off trial
for the shipped content and its evidence hashes match. For `phargus` 0.1.1 none is
recorded yet, so the gate fails. The earlier 0.1.0 and predecessor reviews are archived
as self-attested: their reviewer was an AI assistant and their evidence was never
committed. A sign-off records one person's judgment of one bounded trial.

Evals cover named scenarios with bounded workloads and time limits. They do not
prove that an agent will follow every instruction, diagnose an arbitrary incident
correctly, or preserve the same behavior after its model, client, permissions,
tool version, or shipped skill content changes. PHARN's stub evals also do not
test discovery of a real CLI on `PATH`.

## Permissions and operational limits

Skill instructions are not a technical sandbox. The agent's client, operating
system, and application configuration determine what commands, files, and
network endpoints it can access. The sandbox recorded for an eval is not
automatically installed as a user's security policy. See
[THREAT-MODEL.md](THREAT-MODEL.md) for the boundaries.

`pharn-ci-cover`'s [check-lines helper](plugins/pharn-ci/skills/pharn-ci-cover/scripts/check-lines.mjs)
re-checks the lines a report listed as uncovered against a fresh coverage
report (Report v1 or v2; both carry `diffCoverage` the same way). With
`--base`, it reads `git diff <base>...HEAD` the way pharn-ci 0.1.0 and 0.2.0
do and recomputes the estimate from the added lines, so lines that lost
coverage and files a test now loads are counted. Without `--base`, or when git
cannot run, it assumes every line the report counted as covered still is.
Exclusion patterns are not known to it, only the files the report already
excluded. It reads coverage files with code ported from pharn-ci 0.1.0 (format
detection, lcov and Cobertura parsing, path and source mapping), which 0.2.0
leaves unchanged. On `pull_request`, CI measures the merge commit: when the base
changed a listed file after the branch point, CI's line numbers can differ from
the checkout, which the helper reports (`base.changedFiles`) but cannot
correct. The CI run's verdict decides. On macOS the eval sandbox cannot run
`/usr/bin/git`, so eval runs there exercise only the helper's no-git path; the
`--base` path is covered by its unit tests.
`pharn-ci-install`'s [check-coverage helper](plugins/pharn-ci/skills/pharn-ci-install/scripts/check-coverage.mjs)
mirrors pharn-ci 0.1.0's coverage rules, unchanged in 0.2.0, (auto-discovery, format detection,
path mapping, the coverage-root suggestion) with the same ported code, and the
fixture check compares it with the pinned CLI on the eval trees. It is not
pharn-ci: it does not read `.pharn/ci.yml`, diff the change or apply
exclusions, and when git cannot run it matches paths against files on disk.
When the project's coverage command cannot run locally (a missing dependency,
no toolchain), the skill writes the setup unverified and says so. The
workflows it writes target pharn-ci 0.2.0 on GitHub-hosted runners (`node24`
Actions); GitHub Enterprise Server and self-hosted runners need a version that
runs them. Pins for actions pharn-ci's own docs do not pin (setup-go,
setup-java, pnpm) come from the repository or are left for the person. The
evals check the files it writes, not a real Actions run.
It writes `test-integrity: warn` (or `block` when asked) and never creates
the accept label: the person creates it and their reviewers apply it. Two
pharn-ci 0.2.0 findings can appear on the setup PR itself and are named in
the skill's report: `TEST_INTEGRITY_TI14` when it writes `coverage.exclude`,
and `TEST_INTEGRITY_TI11` when an existing job's `npm test` becomes a coverage
script that pharn-ci does not read as a test command.

Test integrity is explained from the report and the diff. The skills never
apply, remove or request the accept label, and their evals check that no
label command runs; whether a real reviewer's label is honoured is decided by
the pharn-ci Action from GitHub's issue events, which the evals replay through
a stub. The CLI never reads the label, so a local 0.2.x run of an accepted PR
still shows its block findings as errors.
The pharn-ci CLI is not on npm in 0.1.x or 0.2.x, so the skills use a CLI only when the
person has one; otherwise they read the report, the PR comment (which cuts long
lists) or the job log. A single-plugin eval run cannot check that a pharn-ci
question is routed away from the `pharn` plugin's `pharn-cli` skill.

Phargus conclusions are limited by the available evidence. Collector windows and
SSE omit some raw metrics; missing data and unknown loss remain unknown.
Aggregated event-loop p99 is the maximum sample p99, not a reconstructed global
percentile. See the [data semantics](src/phargus/knowledge/data.md).

Heap summaries expose object-name counts and self sizes, not retaining paths or
retained sizes. A positive diff does not prove a leak. Taking a snapshot can
pause the application and increase memory pressure; see the
[memory guidance](src/phargus/knowledge/memory.md).

The [skills.sh synchronization workflow](.github/workflows/skills-sh.yml) sends
install telemetry marked as CI activity. Success confirms installation, not
telemetry delivery, listing publication, or refresh timing. It does not remove
old listings. The README describes retries and manual synchronization.
