# Policy keys, rules and default levels (pharn-ci 0.4.0)

Source: pharn-ci v0.4.0 at commit `a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756`:
`schema/policy.v1.json` (the bundled `scripts/policy.v1.json` is a byte copy),
README ("Org policy"), CHANGELOG and `docs/LIMITS.md` ("Org policy"). pharn-ci
0.1.x to 0.3.x read no policy. The schema closes every object
(`additionalProperties: false`), bounds every list at 1000 items and every
string, and requires only `version`.

A policy document is JSON. The smallest valid one is `{ "version": 1 }`. A key
left out sets nothing.

## Rules and their default levels

Each line names a rule, the policy keys that feed it and its default level.
`policy.rules` sets a rule's severity (`block`, `warn`, `info` or `off`); a
`block` finding is an `error` message and fails the check.

- P01, required agent setup, fed by `setup.require` and `setup.expect`: `error` by default (the codes `NO_AGENT_SETUP_FILES` and `AGENT_SETUP_EXPECTED_MISSING`).
- P02, forbidden permission allowed, fed by `setup.forbidden_permissions`: `error` by default (`warn` for `additionalDirectories`); also flags `defaultMode` `bypassPermissions` or `auto`.
- P03, required deny rule missing, fed by `setup.required_permissions_deny`: `error` by default.
- P04, MCP server not allowlisted, fed by `setup.allowed_mcp_servers`: `error` by default.
- P05, forbidden MCP server, fed by `setup.forbidden_mcp_servers`: `error` by default.
- P06, required hook missing, fed by `setup.required_hooks`: `error` by default.
- P07, agent instruction files disagree, fed by `setup.consistency`: `warn` by default.
- P08, forbidden file tracked, fed by `setup.forbidden_files`: `error` by default.
- P09, the pull request loosens what it is graded by (the policy file, the config, a workflow or an agent settings file): `error`, `warn` or `info` by what changed; no key feeds it.
- P10, policy unavailable, fed by `policy.required`: `warn` by default, `error` with `policy: required` or `policy.required: true`; its severity cannot be overridden.
- P11, agent PR changes a protected path, fed by `agents.protected_paths` and `agents.protected_paths_mode`: `error` by default (`block`).

## Top-level keys

`version`, `coverage`, `setup`, `test_integrity`, `flaky`, `policy`, `agents`
and `dependencies` are the only top-level keys the schema accepts.

### `version` (required)

The number `1`. Not merged: every layer carries the same version.

### `coverage`

Feeds the diff coverage gate (no P rule).

| Key | Meaning |
| --- | ------- |
| `threshold` | Minimum diff coverage percent, 0 to 100. The larger of the policy's and the repository's value applies. |
| `exclude` | Globs of files left out of diff coverage. A served policy replaces the repository's list. Not allowed from a `file:` policy. |
| `root` | Directory relative coverage paths start from, or `null` for the repository root. Not allowed from a `file:` policy. |

### `setup`

Agent setup rules, P01 to P08.

| Key | Feeds | Meaning |
| --- | ----- | ------- |
| `require` | P01 | `true` requires at least one agent setup file; `true` wins over a repository's `false`. |
| `expect` | P01 | Agent tools whose setup files must exist, from the fixed list of tool names (`claude-code`, `cursor`, `copilot`, `codex`, `gemini`, `mcp`, ...); added to the repository's own. |
| `consistency` | P07 | Severity of contradictory instruction files. |
| `forbidden_permissions` | P02 | Permission rules (`Tool` or `Tool(pattern)`) a settings file's `allow` list must not equal, widen or contain. |
| `required_permissions_deny` | P03 | Permission rules that every settings directory must deny, or deny more broadly. |
| `allowed_mcp_servers` | P04 | MCP server names that are allowed. An empty list means any server, so it restricts nothing. |
| `forbidden_mcp_servers` | P05 | MCP server names or command globs that must not be configured. |
| `required_hooks` | P06 | Hooks that must exist, each `{ "event": "PreToolUse", "matcher": "Bash" }` (`event` letters only, `matcher` optional). |
| `forbidden_files` | P08 | Globs of files that must not be tracked. |

### `test_integrity`

Feeds the test-integrity signals TI01 to TI16 (the gate, no P rule).

| Key | Meaning |
| --- | ------- |
| `mode` | `block`, `warn` or `off`. The policy can raise the mode above the workflow input and the config (`block > warn > off`). |
| `signals` | A severity (`block`, `warn`, `info` or `off`) per signal id `TI01` to `TI16`; any other key, `TI17` included, is an error. |
| `accept_label` | The label that signs off test-integrity blocks. Only an app policy may set it; a `file:` policy may not, and `.pharn/ci.yml` never. |

### `flaky`

`flaky.quarantine` is accepted by the schema and not enforced: no 0.4.0 rule
reads it.

### `policy`

Policy mode settings and rule severities.

| Key | Meaning |
| --- | ------- |
| `required` | `true` makes an unavailable policy block the check (P10). Not allowed from a `file:` policy. |
| `rules` | A severity per rule id `P01` to `P14`. 0.4.0 applies it to P01 to P09 and P11; P10 cannot be overridden, and P12 to P14 are accepted by the schema and not enforced. |

### `agents`

Agent pull request detection and rules.

| Key | Meaning |
| --- | ------- |
| `labels` | Extra PR labels that mark an agent PR (added to `agent` and `ai-generated`). |
| `extra_logins` | Extra GitHub logins whose PRs are agent PRs (a trailing `[bot]` is allowed). |
| `protected_paths` | Globs an agent PR must not change (P11). A path that matches is one violation; a rename counts by both its old and new path. |
| `protected_paths_mode` | `block` (the default) or `warn`; the stricter of it and `policy.rules.P11` applies. |
| `require_human_approval`, `max_files`, `max_changed_lines` | Accepted by the schema, not enforced: they are meant for rules P12 and P14, which 0.4.0 does not apply. |

### `dependencies`

`registries`, `min_age_days` and `min_weekly_downloads` are accepted by the
schema and not enforced: no 0.4.0 rule reads them.

## Writing the values

- A glob (`coverage.exclude`, `setup.forbidden_files`, `agents.protected_paths`)
  is repository-relative with `*`, `**` and `?` only: no leading `./`, `/` or
  `!`, no trailing `/`, no `//`, no `..` segment and none of `\ { } [ ]`.
- A permission rule is `Tool` or `Tool(pattern)`. In a rule `/x` is relative to
  the settings file's project directory and `//x` is absolute, so the system
  `/etc` is `Edit(//etc/**)`.
- A `root` is a normalized repository-relative directory (`.` is the root), not
  absolute, with no `..` segment.
- A login is a GitHub login of at most 39 characters, optionally followed by
  `[bot]`; a label is at most 50 characters.
- Rules are compared with rules, never with what a command does:
  P02 to P06 are text guards, not a security boundary. `Bash(curl:*)` denied
  does not stop `/usr/bin/curl` or `sh -c`; sandboxing is the boundary.
- `agents.protected_paths` can block Dependabot and Renovate, which count as
  agent PRs: do not protect files those bots must update.

## Example

```json
{
  "version": 1,
  "coverage": { "threshold": 80 },
  "setup": {
    "forbidden_permissions": ["Bash(curl:*)"],
    "required_permissions_deny": ["Bash(rm -rf:*)"]
  },
  "agents": {
    "protected_paths": [".github/workflows/**", "migrations/**"],
    "protected_paths_mode": "block"
  }
}
```
