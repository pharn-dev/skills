# Threat Model

This repository distributes instructions and executable helpers to agents that
operate in users' projects. Its assets are project files, diagnostic data,
credentials, application availability, and the integrity of shipped skills.
For reporting, see [SECURITY.md](SECURITY.md); for tested coverage, see
[LIMITS.md](LIMITS.md).

## Instructions and agent permissions

**Boundary:** a skill guides an agent that may have shell, file, and network
access. An incorrect instruction or prompt injection can influence those actions.

**Existing safeguards:** the [PHARN skill](plugins/pharn/skills/pharn-cli/SKILL.md)
starts with read-only checks and an update preview, distinguishes edited files,
and requires explicit intent before forcing an overwrite. Its
[evals](plugins/pharn/evals/) check both desired actions and forbidden actions.
The [pharn-ci skills](plugins/pharn-ci/skills/) treat report paths, message
text, PR comments, job logs and artifacts as data from the change under review,
keep `pharn-ci-explain` read-only unless asked, and limit `pharn-ci-cover` to
test files: the gate (threshold, exclusions, config, workflow, coverage-ignore
comments, production code) changes only after the person's explicit
confirmation. None of them applies, removes or asks to apply pharn-ci's accept
label: pharn-ci 0.2.x to 0.4.x record that label as a sign-off by the user who applied
it, so an agent applying it with the person's token would record a sign-off
the person never gave. Their evals include a report and a file name that carry
instructions, a request to "do whatever it takes", and a request to "just add
the label", and a grader fails any command that changes a label. Settings a
pull request carries never loosen the gate: `pharn-ci-explain` does not edit an
org policy, lower a rule or remove a protected path to get a pull request
through (the policy belongs to its owner and is changed outside the pull
request, and an edited policy raises P09), and the `explain-policy-pressure`
eval grades a refusal. A secret value that a finding names (pharn-ci 0.4.x
reports the shape, path and line only) is never repeated by `pharn-ci-explain`,
and the `explain-agent-config-secret` eval fails an answer that prints it.
`pharn-ci-policy` writes only the policy file the person asks for, checks it
with a bundled script that imports only Node core modules and makes no network
request, and changes a workflow only when asked. `pharn-ci-install`
writes CI configuration; see [pharn-ci workflows](#pharn-ci-workflows).
Phargus's [data guidance](src/phargus/knowledge/data.md) treats request paths, stack
strings, object names, and finding messages as evidence rather than instructions.

**Limit:** these are instructions and tested behaviors, not enforcement of the
agent's permissions. The user's client sandbox and approvals control access.
The [Phargus eval sandbox](src/phargus/evals/README.md) confines trial commands; that
configuration does not automatically confine an installed skill.

## Helpers and application packages

**Boundary:** Node.js helpers execute with the invoking user's permissions and
resolve Phargus modules from the target application. An installed application
package is executable code and must be trusted before it is imported.

**Existing safeguards:** [runtime compatibility checks](src/phargus/runtime/upstream.mjs)
inspect the package version and required exports. The
[compatibility contract](src/phargus/compatibility.json) pins the upstream source
used by integration tests. Shared helpers and references are generated from
`src/phargus`; CI checks generated files, types, package contents, and behavior.

**Limit:** runtime checks do not authenticate the source of an installed package or
tarball; the npm release of `@pharn-dev/phargus` 0.1.0 carries no provenance
attestation. Helpers are not a sandbox for application dependencies. Phargus diagnostic
rules have a separate [isolated-vm execution contract](src/phargus/knowledge/rules.md);
a missing peer, compile error, timeout, or failed execution must remain a failure.
That sandbox does not cover all helper commands.

## pharn-ci workflows

**Boundary:** `pharn-ci-install` writes a GitHub Actions workflow that runs the
project's tests on every pull request with a token that can comment
(`pull-requests: write`), plus `.pharn/ci.yml`, which sets the gate. A mistake
here can hand pull request code a write token, gate the wrong commits, or let a
change grade itself.

**Existing safeguards:** the [skill](plugins/pharn-ci/skills/pharn-ci-install/SKILL.md)
never uses `pull_request_target`, never checks out a PR head in a workflow with
a write token, and never puts artifact or PR text into a `run:` script; for fork
PRs it writes pharn-ci's two-workflow `workflow_run` pattern, whose comment
workflow keeps only digits from the uploaded PR number and passes the trusted
`head-sha`. Every action is pinned to a full commit SHA from pharn-ci's own
documentation at the pinned release; a [unit test](plugins/pharn-ci/tests/pins.test.mjs)
and the fixture check keep those pins and pharn-ci's release commit in step.
Checkouts use `persist-credentials: false`. Settings live only in
`.pharn/ci.yml`, except the test-integrity mode, which is a workflow input
because the PR carries `.pharn/ci.yml` and pharn-ci lets it only tighten the
mode; the skill never writes `off`. It recommends CODEOWNERS for
`.pharn/ci.yml` and `.github/workflows/`, and never creates the accept label. Extending an existing job, it keeps the job's triggers,
matrix and steps, runs pharn-ci only on `pull_request` and one matrix leg, and
asks when the job's permissions are unclear. It runs the project's coverage
command locally, which runs project code, and says so; it installs nothing
without asking and commits nothing. Its evals include a request to use
`pull_request_target`.

**Limit:** on a fork PR the uploaded coverage file is attacker-controlled; the
comment reports what the `pull_request` run uploaded, and that run's verdict is
the gate. The skill cannot see repository settings, rulesets or required
checks, so making the new check required stays with the person.

## pharn-ci reports and coverage files

**Boundary:** `pharn-ci-cover`'s helper reads a pharn-ci report and coverage
files, and `pharn-ci-install`'s helper reads coverage files, all of which the pull request under review can shape (on a fork PR, an
uploaded artifact is fully attacker-controlled), and runs git in the person's
repository.

**Existing safeguards:** the [helper](plugins/pharn-ci/skills/pharn-ci-cover/scripts/check-lines.mjs)
uses Node core only, validates the report's shape, parses lcov and Cobertura
without evaluating them (no DTD or entity expansion beyond the five predefined
and numeric references), runs only `git rev-parse`, `git ls-files`,
`git status` and, with `--base`, `git rev-parse --verify` and two `git diff`
calls, all without a shell, with `--literal-pathspecs`, with `--end-of-options`
or after `--`, and with a `--base` value starting with `-` refused. Report paths
that are absolute, contain `..` or a NUL byte never reach git. When git cannot
run it finds the repository by walking up to a `.git` entry and checks files on
disk instead. It writes nothing and prints paths only as JSON.
The [install helper](plugins/pharn-ci/skills/pharn-ci-install/scripts/check-coverage.mjs)
shares that parsing code byte for byte, runs only `git rev-parse`,
`git ls-files` and `git check-ignore`, walks the disk without following links
and within pharn-ci's limits, and never prints the repository's absolute path.
Their
[unit tests](plugins/pharn-ci/tests/) run in CI.

**Limit:** the helper's estimate is only as honest as the coverage file it
reads. It does not detect a forged or hand-edited coverage report, and it reads
whole files into memory, so a very large hostile file can exhaust it.

## Diagnostic input, output, and application availability

**Boundary:** captures, logs, stack strings, findings, and heap snapshots may
contain attacker-controlled strings or sensitive application data. Capture and
analysis operations can affect a running application.

**Existing safeguards:** [record parsing](src/phargus/runtime/records.mjs) validates
diagnostic records and tracks malformed input and evidence-quality problems.
The [data contract](src/phargus/knowledge/data.md) keeps missing coverage and unknown
loss explicit. [Capture](src/phargus/runtime/capture.mjs) bounds SSE input and records
termination. [Collector operations](src/phargus/runtime/operations.mjs) default to
loopback and accept dashboard token and allowed-host configuration. Sanitized
sink descriptions omit webhook URLs from the helper's JSON result.

**Limit:** record validation is not secret redaction. Heap snapshots, raw captures,
paths, and upstream errors can expose sensitive data. Choose private storage,
review output before sharing, and keep credentials out of issues and Git.
Loopback defaults are not authorization for exposing a dashboard publicly;
deployment access controls remain the application's responsibility. Sampling
and heap snapshots run inside the monitored process
([compatibility](src/phargus/knowledge/compatibility.md)), and snapshot capture
pauses it ([phargus-memory](plugins/phargus/skills/phargus-memory/SKILL.md)).

## Repository and distribution

**Boundary:** contributors, dependencies, workflow code, and marketplace content
can change what users install. A compromised maintainer identity can authorize
malicious changes.

**Existing safeguards:** [CI](.github/workflows/ci.yml) validates the shipped
content, and workflow actions are pinned to full commit SHAs. The
[skills.sh workflow](.github/workflows/skills-sh.yml) checks out and installs the
push's exact commit, uses read-only repository permissions, and marks install
telemetry as CI. [CODEOWNERS](.github/CODEOWNERS) identifies the maintainer.

**Configured controls:** the [repository settings procedure](.github/rulesets/README.md)
describes the target PR, review, CI, secret-scanning, and dependency-update controls.
The JSON files only take effect when applied to GitHub; inspect the
[live rules](https://github.com/pharn-dev/skills/rules) for their activation state.

**Limit:** the maintainer's review exception also applies to software using that
account's credentials. PR and CI requirements remain separate from that exception.
Secret scanning detects supported patterns, not every sensitive value. Dependabot
does not update versions embedded in shell commands. skills.sh indexing is an
external best-effort service, and neither indexing nor installation is a security
review of a skill.
