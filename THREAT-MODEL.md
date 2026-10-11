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
Phargus's [data guidance](src/phargus/knowledge/data.md) treats request paths, stack
strings, object names, and finding messages as evidence rather than instructions.

**Limit:** these are instructions and tested behaviors, not enforcement of the
agent's permissions. The user's client sandbox and approvals control access.
The [Phargus eval sandbox](src/phargus/VERIFICATION.md) confines trial commands; that
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

**Limit:** runtime checks do not authenticate the source of an arbitrary installed
tarball. Helpers are not a sandbox for application dependencies. Phargus diagnostic
rules have a separate [isolated-vm execution contract](src/phargus/knowledge/rules.md);
a missing peer, compile error, timeout, or failed execution must remain a failure.
That sandbox does not cover all helper commands.

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
deployment access controls remain the application's responsibility. Snapshot
capture pauses and memory overhead are described in the
[memory guidance](src/phargus/knowledge/memory.md).

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
