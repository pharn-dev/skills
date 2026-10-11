# Security Policy

This policy covers the skills, bundled helpers and references, dependency
configuration, marketplaces, and GitHub Actions in `pharn-dev/skills`.

## Supported revisions

Security fixes are made against the current `main` branch. Older commits and
plugin versions may remain installable, but backports are not guaranteed.
Update installed skills or plugins to receive fixes; a pinned installation does
not update itself when this repository changes.

The tested tool and agent combinations are described in [LIMITS.md](LIMITS.md).
The trust boundaries and existing safeguards are described in
[THREAT-MODEL.md](THREAT-MODEL.md).

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/pharn-dev/skills/security/advisories/new),
or email `support@pharn.dev` with `[PHARN SKILLS SECURITY]` in the subject.
Keep vulnerability reports and sensitive diagnostic data out of public issues
and pull requests.

Include:

- The affected skill, helper, reference, dependency, or workflow and its path.
- The installed revision or plugin version, installation method, agent and
  version, and relevant PHARN CLI, Argus, Node.js, or operating system version.
- Reproduction steps and a minimal proof of concept, when available.
- The permissions and configuration needed, expected and observed behavior,
  and potential impact.
- Sanitized output that supports the report. Arrange a private transfer before
  sending heap snapshots, credentials, or production captures.

Maintainers will investigate and coordinate disclosure with the reporter.
This project does not promise fixed response or resolution times.

## Scope and routing

Report vulnerabilities here when the defect is in shipped skill instructions,
bundled scripts or references, generated packages, dependency configuration,
or the repository's build and distribution workflows. Examples include unsafe
command construction, mishandling sensitive diagnostic data, or executing
untrusted diagnostic content as instructions or host code.

For a defect in a tool itself, follow its own reporting policy:

- [PHARN CLI security policy](https://github.com/pharn-dev/pharn-cli/security/policy).
- [Argus security policy](https://github.com/pharn-dev/argus/security/policy).

If the boundary is unclear, contact `support@pharn.dev` so maintainers can route
the report. Ordinary installation failures and incorrect diagnoses without a
security impact belong in the [bug report form](https://github.com/pharn-dev/skills/issues/new?template=bug_report.yml).
