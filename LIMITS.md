# Compatibility and Limits

## Tested combinations

| Plugin | Agent coverage | Tool contract and evidence |
| ------ | -------------- | -------------------------- |
| `pharn` | Claude Code; development instructions verified with 2.1.295. Codex behavior has not been verified. | The [skill](plugins/pharn/skills/pharn-cli/SKILL.md) targets PHARN CLI 0.10.0+ and describes a 0.9.x fallback. Its [evals](plugins/pharn/evals/) use a stub CLI, including 0.10.0-shaped output and an older text flow. They do not establish compatibility with every real CLI release. |
| `phargus` | Targets Codex and Claude Code; current results are in the [verification record](src/phargus/VERIFICATION.md), with the predecessor's trials archived separately. | The tested runtime release (tag and commit), the accepted package versions, and the minimum Node version are in [compatibility.json](src/phargus/compatibility.json). CI targets Node 22.18.0 and 24. |

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
tests. Behavioral evals are separate, require model credentials, and are reviewed
locally. The [Phargus verification metadata](src/phargus/VERIFICATION.json) records
the reviewed rename cases and the fingerprint of the content they reviewed, with the
predecessor's results archived separately. `npm run check:evals` reports whether that
fingerprint still matches the shipped content; for `phargus` 0.1.1 it does not, and a
fresh review is pending.

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
