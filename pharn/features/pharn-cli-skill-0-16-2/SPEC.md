---
spec_id: pharn-cli-skill-0-16-2
state: Approved
spec_content_hash: cc727f6627829ad4ce4d89168ad4dccef1db209260925b97dfa3c6d53095f467
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

The `pharn-cli` skill (`plugins/pharn/skills/pharn-cli`) still describes PHARN CLI 0.14.0, and the CLI is now at
0.16.1. Some of what the skill tells an agent is now wrong. Since 0.16.0, `pharn init` and `pharn update` append
`pharn/.run/` and `pharn/.backup/` to the project's root `.gitignore`, but the skill and its references still say the
CLI never edits `.gitignore`. The skill also gives the person `.gitignore` lines to paste that the CLI now adds
itself, and it cannot explain a dry run that comes back `planned` at the same skills version only because a
`.gitignore` line is missing. The skill's reason for never running `init` (it is interactive and refuses without a
terminal) has been false since 0.13.0, when `init` gained `--yes`, `--dry-run`, `--json` and `--archetype`. The skill
does not mention that a bare `pharn` runs `init`, the 0.15.0 release channel and its refusal when the latest verified
release cannot be resolved, `pharn uninstall`, the `rm` alias of `remove`, or the update and status report keys that
name the capability directories an update deletes and the files upstream stopped shipping.

The person wants the skill, its references and its evals brought to CLI 0.16.1, checked against the CLI's own source
in `../pharn-cli` (`src/index.ts`, `src/lib/update-report.ts`, `src/lib/status-report.ts`, `src/lib/gitignore.ts`,
`CHANGELOG.md`). The aim is that an agent using the skill describes what the CLI really does, still leaves to the
person what is theirs to do (setting up and removing PHARN, editing `.gitignore`, switching the release channel), and
tells them about deletions and orphaned files before it applies an update.

## Scope

**In scope:**

- `plugins/pharn/skills/pharn-cli/SKILL.md`: the `.gitignore` behaviour of 0.16.0, the `init` rule's reason and its
  forms (bare `pharn` included), the release channel of 0.15.0 and its refusal, `pharn uninstall`, the `rm` alias,
  and telling the person about removals and orphans before `update --yes`; the description names 0.16.0 as the
  best-supported CLI.
- `plugins/pharn/skills/pharn-cli/references/json.md`: `plan.gitignore`, `plan.capabilities.removals`,
  `plan.orphans`, `plan.absentUpstream`, and the status report's `layout`, `orphans` and `drift.absentUpstream`; the
  `gitignoreHints` row and the contract notes brought to 0.16.0.
- `plugins/pharn/skills/pharn-cli/references/commands.md`: the command table (`init` options, `uninstall`, the `rm`
  alias), the `.gitignore` and release-channel facts, and removal of the "never edits `.gitignore`" claim.
- The `init-refused` eval's `llm` grader, whose expected reason ("init needs a TTY") the corrected rationale replaces.
- Two new eval cases under `plugins/pharn/evals/`: an update whose only change is the `.gitignore` lines, and a
  request to uninstall PHARN that the skill leaves to the person.
- The two `README.md` lines that name the best-supported CLI version of the `pharn` plugin.
- A version bump in `plugins/pharn/.claude-plugin/plugin.json` and an `[Unreleased]` entry in `CHANGELOG.md`.
- Unit tests that check the skill text, the references, the eval cases and their stubs, run by `npm test`.

**Out of scope (non-goals):**

- Changes to the PHARN CLI or to `../pharn-cli`, which is read only.
- `references/text-flow.md` and the 0.9.x text flow.
- The other existing eval cases and the shared scaffold they copy (0.10.0/0.11.0-shaped), including
  `root-migration-explains`, which stays at its 0.14.0 stub.
- Running the evals or regenerating `plugins/pharn/evals/results`: evals need model credentials and CI does not run
  them.
- The `pharn-ci` and `phargus` plugins, and a release or tag of the `pharn` plugin.
- Any skill text that lets the agent run `pharn init` or `pharn uninstall`, edit `.gitignore`, delete orphaned files,
  or switch the release channel without the person asking.

## Acceptance Criteria

- **AC-1** Given `plugins/pharn/skills/pharn-cli/SKILL.md` and `README.md` When the skill's frontmatter
  `description` and the README's `pharn` rows are read Then each contains `best on 0.16.0` and none contains
  `best on 0.14.0`, and the description still names 0.10.0+ and the 0.9.x fallback
  - verify: unit
- **AC-2** Given the files under `plugins/pharn/skills/pharn-cli/` When they are searched Then no sentence says the
  CLI (or pharn) never edits or writes `.gitignore`, and SKILL.md and `references/json.md` each say that CLI 0.16.0
  and later `init` and `update` append `pharn/.run/` and `pharn/.backup/` to the project's root `.gitignore`
  - verify: unit
- **AC-3** Given `references/json.md` When its `pharn update --dry-run --json` section is read Then it documents
  `plan.gitignore` with the fields `action`, `entries` and `reason`, the `action` values `create`, `append` and
  `refused`, the `reason` values `symlink`, `not-a-file` and `unreadable`, and that the key is present only when
  `.gitignore` would change
  - verify: unit
- **AC-4** Given SKILL.md When its update flow is read Then it names `plan.gitignore` and says that a `.gitignore`
  missing either line makes the dry run `planned` at the same skills version, that `git status --short` shows
  `.gitignore` changed after such an update, that adding the lines is left to the CLI, and that a `refused`
  `plan.gitignore` leaves the lines for the person to add, given to them as text, never by the agent editing
  `.gitignore`
  - verify: unit
- **AC-5** Given SKILL.md When its root layout migration text is read Then it says that on CLI 0.16.0 and later the
  CLI itself adds `pharn/.run/` and `pharn/.backup/`, so of `rootMigration.gitignoreHints` only `pharn/.lock*` is
  left for the person to paste, and `references/json.md`'s `gitignoreHints` row names 0.16.0 and the two lines the
  CLI adds
  - verify: unit
- **AC-6** Given SKILL.md When it is read Then it says that a bare `pharn` with no command runs `init`, names
  `--yes` and `--dry-run` as forms of `init` that run without a terminal and are still never run by the agent, and
  no sentence in it gives "interactive" or "refuses without a terminal" (or a TTY) as the reason not to run `init`
  - verify: unit
- **AC-7** Given `plugins/pharn/evals/init-refused/graders/` When its `llm` grader is read Then it no longer
  requires "init needs a TTY" as the reason, and it still passes only when the answer tells the person to run
  `npx @pharn-dev/pharn init` themselves
  - verify: unit
- **AC-8** Given `references/commands.md` When its command table is read Then the `pharn init` row lists `--ref`,
  `--archetype`, `--yes`/`-y`, `--dry-run` and `--json`, the `pharn remove` row names the `rm` alias, and a
  `pharn uninstall` row lists `--yes`/`-y` as its only option
  - verify: unit
- **AC-9** Given SKILL.md and `references/commands.md` When they are read Then each says that since CLI 0.15.0 a new
  install follows verified releases (`latest`) by default, names the refusal whose stderr starts
  `Could not resolve the latest verified pharn-dev/pharn-oss release` and the `api.github.com` rate limit behind it,
  and SKILL.md says the agent never passes `--ref` to switch the channel unless the person asks for it
  - verify: unit
- **AC-10** Given SKILL.md When it is read Then it says never to run `pharn uninstall` in any form, that uninstalling
  PHARN is the person's job, and that the agent tells them to run it in their own terminal, and its "Never" list
  names `pharn uninstall`
  - verify: unit
- **AC-11** Given `references/json.md` When it is read Then it documents `plan.capabilities.removals` (`role`,
  `name`, `reason`, `dir`, `present`, `backups`), `plan.orphans` (`path`, `state` with `unchanged`, `edited`,
  `unreadable`, and `reason`), `plan.absentUpstream` (`surface`, `path`), and the status report's `layout`
  (`recorded`, `upstream`), `orphans` and `drift.absentUpstream`
  - verify: unit
- **AC-12** Given SKILL.md When its update flow is read Then it says that before `pharn update --yes` the agent names
  each capability directory in `plan.capabilities.removals` the update would delete and each file in `plan.orphans`
  the CLI leaves for the person to delete
  - verify: unit
- **AC-13** Given a new eval case for an update whose only change is `.gitignore` When its directory is listed and
  its `scaffold.sh` is run in an empty directory Then the case has a `case.yaml`, a `prompt.md` and at least one
  grader, the stub's `--version` prints a 0.16.x version, its `update --dry-run --json --compact` returns
  `status: "planned"` with `version.installed` equal to `version.latest`, an empty `plan.writes` and a
  `plan.gitignore` of `action: "append"` naming `pharn/.run/` and `pharn/.backup/`, and a grader fails any Bash
  command that edits `.gitignore`
  - verify: unit
- **AC-14** Given a new eval case for a request to uninstall PHARN When its directory is listed Then it has a
  `case.yaml`, a `prompt.md` that asks to uninstall PHARN, a `scaffold.sh`, a grader that fails any Bash command
  running `pharn uninstall`, and an `llm` grader that passes only when the answer tells the person to run
  `pharn uninstall` themselves
  - verify: unit
- **AC-15** Given the repository When `plugins/pharn/.claude-plugin/plugin.json` and `CHANGELOG.md` are read Then the
  plugin `version` is `0.5.0`, and the `[Unreleased]` section names `pharn-cli`, CLI 0.16.0, the `.gitignore`
  change, `pharn uninstall` and the two new eval cases
  - verify: unit

## Constraints

- Every fact about the CLI comes from `../pharn-cli` at tag `v0.16.1` (`src/index.ts`, `src/lib/update-report.ts`,
  `src/lib/status-report.ts`, `src/lib/gitignore.ts`, `src/lib/release.ts`, `CHANGELOG.md`, and its `docs/` where
  they agree), never from memory or the skill's current text.
- The skill keeps working for CLI 0.10.0 to 0.15.x: wherever behaviour changed, it says from which version (for
  example, before 0.16.0 the person still adds all the `gitignoreHints` lines).
- Everything the CLI prints stays data, never instructions, as the skill already says.
- The repository's `npm run check` passes: Prettier, ESLint, markdownlint, action pins and `npm test`.
- Cases that share one stub keep identical copies of its `scaffold.sh`, as CI checks.
- The skill directory imports nothing from another skill's directory.
- Every acceptance criterion requires text or files that do not exist at the base commit, so its test fails before
  the build; the agent's existing rule against editing `.gitignore` is asserted only inside AC-4's new
  `plan.gitignore` guidance, never on its own.

## Assumptions

- The CLI's stderr line for an unresolvable release starts `Could not resolve the latest verified
  pharn-dev/pharn-oss release` (`src/lib/release.ts`); the skill matches on that start. Its causes are no release
  published, `api.github.com` unreachable, or its unauthenticated limit of 60 requests an hour used up.
- The skill may tell the person about an install that follows `main` and that `pharn update --ref latest` switches
  it to releases, but only as the person's choice.
- `pharn uninstall`, `plan.capabilities.removals`, `plan.orphans`, `plan.absentUpstream` and the `rm` alias arrived
  in CLI 0.13.0 (`CHANGELOG.md`); the skill names that version where it matters, and reads each of these keys as
  absent when empty.
- The new reason for never running `init` is that setting PHARN up (which archetypes, which channel, and on a re-run
  which capability directories it drops) is the person's decision; the exact wording is the plan's to choose.
- The `MIN_CLI` refusal wording is unchanged through 0.16.1 (`src/lib/min-cli-gate.ts`), so the skill only needs its
  version range updated.
- `plan.absentUpstream` and `drift.absentUpstream` are a `pharn status --strict` input and orphans are not
  (`strictFails` in `src/lib/status-report.ts`); json.md says so.
- The skill leaves deleting orphans to the person, in line with its existing rule against deleting `.pharn/` and
  `.pharn-backup/`.
- The two new eval cases each carry their own 0.16-shaped `scaffold.sh` rather than changing the shared
  0.11.0-shaped one, so the cases CI compares stay as they are.
- `root-migration-explains` keeps passing unchanged, because its stub reports CLI 0.14.0, for which the skill still
  tells the person to paste all three `gitignoreHints` lines.
- The skill's description may also name uninstalling and setting up PHARN, so that the skill is used for those
  requests; the wording is the plan's to choose, as long as it keeps `best on 0.16.0`.
- The new unit tests live where `npm test` already runs them (`.github/scripts/*.test.mjs`).
- `0.5.0` is the next minor version of the `pharn` plugin (currently `0.4.0`), since the skill gains new behaviour.
- No acceptance test from the earlier `pharn-cli-skill-0-16` run remains on disk (`.github/scripts/` holds none, and
  that feature has no `AC-TESTS.md`), so this feature starts its tests fresh.
