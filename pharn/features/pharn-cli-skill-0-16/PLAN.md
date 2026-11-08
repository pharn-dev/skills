---
spec_id: pharn-cli-skill-0-16
spec_content_hash: 4ac9543f6e8dad91adb5acd30d4ca1067649f0527a6dad142f7e12019659356b
applied_lessons: none
---

## Approach

ADVISORY — model work. Bring the `pharn-cli` skill (SKILL.md and two of its three references) from CLI 0.14.0 to CLI
0.16.1, add two eval cases, bump the `pharn` plugin to 0.5.0 and add a CHANGELOG entry. Every CLI fact comes from
`../pharn-cli` at tag `v0.16.1` (HEAD there is `0d59327596fa9a01df03482cc50e39cc5016a3d6`, which `v0.16.1` names,
verified this run). The build agent re-reads the source files named below rather than copying from this plan.

Facts read this run from `../pharn-cli` (data, quoted for the build, to be re-checked there):

- `src/lib/gitignore.ts`: `PHARN_GITIGNORE_ENTRIES = ['pharn/.run/', 'pharn/.backup/']`; append-only; comment line
  `# PHARN run state and update backups (added by pharn)`; `GitignoreRefusal = 'symlink' | 'not-a-file' |
  'unreadable'`; the JSON projection `gitignoreReport` is `{action: 'create'|'append', entries}` or `{action:
  'refused', reason, entries}`, and `null` (key absent) for `none`. Text lines: `.gitignore: would add … (PHARN's run
  state and update backups).` (preview), `Added … to .gitignore (…)`, `Created .gitignore with …`, and on refusal
  `.gitignore would not be updated: … Add these lines yourself so PHARN's run state is never committed: …`.
- `src/commands/update.ts` (lines 383–401, 461–464) and `docs/commands/update.md` `## .gitignore`: at the same skills
  version a writable `.gitignore` missing either line re-opens the "Already up to date" return, with the header note
  `.gitignore does not yet keep PHARN's run state and backups out of git — this run re-applies the install and adds
  them.`; a `.gitignore` pharn cannot write (symlink, directory, unreadable) does not re-open it. The root migration
  note says of the `gitignoreHints` that the first two are appended anyway.
- `src/lib/update-report.ts`: `plan.capabilities.removals?` `{role, name, reason, dir, present, backups[]}` (reason
  is `DropReason`: `dropped-unselected` | `dropped-gone`, `src/lib/capability-removal.ts`), present only when non-empty;
  `plan.absentUpstream?` `{surface, path}` (surface ∈ `commands`, `hooks`, `trusted-doc`, `license`,
  `features-readme`, `contracts`, `core`, `floor` — `src/lib/install-manifest.ts`), present only when non-empty;
  `plan.orphans?` `{path, state, reason?}` (state `unchanged` | `edited` | `unreadable`, reason only on
  `unreadable` — `src/lib/orphans.ts`), present only when non-empty, never filtered by `--compact`; `plan.gitignore?`
  (0.16.0).
- `src/lib/status-report.ts`: `layout: {recorded, upstream}` (`upstream` null under `--no-drift`; a difference is
  not a `--strict` input); `drift.absentUpstream[]` `{surface, path}`; top-level `orphans` (array or `null` when not
  determined: `--no-drift`, no usable records, or a clone at another layout; never a `--strict` input);
  `strictFails` counts `absentUpstream`.
- `src/index.ts`: `init` is the default command (`argv._[0] ?? 'init'`; help page: "`pharn` alone runs it");
  `init` takes `archetype`, `ref`, `yes`, `dry-run`, `json` (`--json` requires `--dry-run`); `remove` has
  `aliases: ['rm']`; `uninstall` takes `yes` only; `-y` is the short alias of `--yes` wherever `--yes` is taken.
  `init --yes` installs without prompts only when no file would be overwritten.
- `src/lib/release.ts`: the refusal starts `` Could not resolve the latest verified ${REPO} release: `` with `REPO =
  'pharn-dev/pharn-oss'` (`src/lib/constants.ts`); HTTP 403/429 from `api.github.com` gives the reason `GitHub
  refused the request (HTTP <n> from <url>) — the unauthenticated API allows 60 requests an hour per address`; the
  message names `pharn init --ref main` / `pharn update --ref main`. Fail-closed: it never floats to `main`.
- `CHANGELOG.md` 0.15.0: new installs record `"ref": "latest"`; an install that records no `ref` stays on `main`, and
  each `update` on it (not with an explicit `--ref`, not under `--json`) prints one line saying releases are now the
  default and how to switch; `status` gains a `Channel` row.
- `docs/commands/uninstall.md`: deletes only recorded files whose hash still matches, then empty directories,
  `pharn.records.json`, and `pharn.config.json` after backing it up to `pharn/.backup/<timestamp>/`; never deletes an
  edited or unrecorded file, `.claude/settings*.json`, any `pharn/.backup/`, or the `.gitignore` lines pharn added;
  asks one question defaulting to No; off a terminal without `--yes` it refuses with exit 1.
- `src/lib/min-cli-gate.ts`: the `MIN_CLI` refusal wording is unchanged through 0.16.1.

Shape of the change:

1. SKILL.md keeps its structure (sections 1–5, Root layout migration, Never, Exit codes) and gains facts with the
   version they arrived in, so 0.10.0–0.15.x keep working (Constraint: "from which version").
2. The two new eval cases each carry their own 0.16-shaped `scaffold.sh`; the seven cases the CI `cmp` loop compares
   and `root-migration-explains` are not touched.
3. The tests go in `.github/scripts/`, which the existing `npm test` glob (`.github/scripts/*.test.mjs`) already
   runs, so `package.json`'s `test` script is not changed (a test-script change would be a `spec_kind: test-infra`
   increment and read `test-infra-changed` at `/pharn-verify`). They are listed in AC-TESTS.md only.

## Applied lessons

- none — `check-lessons-index.mjs --verdict` printed `NO_CANON`: this project has no promoted lessons in
  `pharn/memory-bank/lessons-learned.md` yet, so there is nothing to apply.

## Steps

- **SKILL.md frontmatter.** Change `best on 0.14.0` to `best on 0.16.0`; keep `0.10.0+` and the 0.9.x fallback. The
  description may also say the skill answers requests to set up or uninstall PHARN by telling the person how (so it
  triggers for them), within the 1024-character limit.
- **SKILL.md intro.** "Written for CLI 0.10.0+" line: add `.gitignore` lines from 0.16.0. Replace the `init` rule's
  reason: since 0.13.0 `init --yes`, `--dry-run`, `--json` and `--archetype` run without a terminal, so the reason is
  no longer "needs a terminal" but that setting PHARN up (archetypes, the files it writes, hooks, `.gitignore`) is the
  person's decision. Say: never run `pharn init` in any form — `--yes`/`-y` and `--dry-run` included, which run
  without a terminal and are still never run — and never a bare `pharn` with no command, which runs `init`. Add the
  same rule for `pharn uninstall`: never run it in any form (`--yes` included); uninstalling is the person's job; tell
  them to run it in their own terminal.
- **SKILL.md section 1/2.** Note that `pharn --version` is a global flag (fine) and a bare `pharn` is not. In
  section 2, `status --json`: add `layout`, top-level `orphans` and `drift.absentUpstream` as fields to quote, with a
  pointer to json.md, and that `version.channel` names the channel.
- **SKILL.md, release channel (new short subsection, or in section 3).** Since CLI 0.15.0 a new install follows
  verified releases (`latest`) by default; an install that records no `ref` stays on `main`, and `update` prints one
  line about it. If a command fails with stderr starting `Could not resolve the latest verified pharn-dev/pharn-oss
  release`, nothing was written: report it, say when it names HTTP 403/429 from `api.github.com` that the
  unauthenticated API allows 60 requests an hour per address (wait and retry), and that following `main` instead
  (`--ref main`) is the person's choice. Never pass `--ref` to switch the channel unless the person asks for it.
  `pharn update --ref latest` moving an install off `main` is offered only as their choice.
- **SKILL.md section 3 (update flow).**
  - Under `planned`: a `.gitignore` missing `pharn/.run/` or `pharn/.backup/` makes the dry run `planned` at the same
    skills version (`version.installed` equals `version.latest`, `plan.writes` may be empty); then `plan.gitignore`
    (CLI 0.16.0+) says what the CLI would add — say so instead of "nothing to update". A `refused` `plan.gitignore`
    (its `reason`) means the CLI leaves the file alone: give the `entries` as text for the person to add.
  - Before `pharn update --yes`: name each capability directory in `plan.capabilities.removals` the update would
    delete (`dir`, `reason`, and `backups` when `present`), and each file in `plan.orphans` the CLI leaves on disk for
    the person to delete (with `state`). Mention `plan.absentUpstream` when present.
  - After the update: `git status --short` shows `.gitignore` changed when the CLI added the lines; report it as the
    CLI's change. Do not delete orphans for the person.
- **SKILL.md Root layout migration, `.gitignore` bullet.** On CLI 0.16.0 and later the CLI itself adds `pharn/.run/`
  and `pharn/.backup/`, so of `rootMigration.gitignoreHints` only `pharn/.lock*` is left for the person to paste;
  before 0.16.0 they paste all the hints (this keeps `root-migration-explains`, whose stub is 0.14.0, passing). Keep
  "never edit `.gitignore` yourself".
- **SKILL.md section 4.** `pharn remove <name>` (alias `pharn rm`). Section 5 becomes "init and uninstall are the
  person's job": `npx @pharn-dev/pharn init` / `pharn uninstall` in their own terminal; what uninstall keeps (edited
  and unrecorded files, `.claude/settings*.json`, `pharn/.backup/`, the `.gitignore` lines). Never list: add `Run pharn
  uninstall, in any form`; keep `Edit .gitignore`; add not deleting orphaned files for the person.
- **json.md.** Retitle/source line to cover 0.16.1 (`src/lib/update-report.ts`, `src/lib/status-report.ts`). Status
  table: rows for `layout` (`recorded`, `upstream`; not a `--strict` input), `orphans` (`{path, state, reason?}` or
  `null`; not a `--strict` input), and `drift` gains `absentUpstream[]` (`{surface, path}`; a `--strict` input).
  Update plan table: `capabilities` gains `removals?` (`role`, `name`, `reason`, `dir`, `present`, `backups`),
  rows for `absentUpstream?` (`surface`, `path`), `orphans?` (`path`, `state` with `unchanged`, `edited`,
  `unreadable`, `reason` only on `unreadable`), and a `### plan.gitignore (0.16.0+)` subsection: fields `action`,
  `entries`, `reason`; `action` values `create`, `append`, `refused`; `reason` values `symlink`, `not-a-file`,
  `unreadable`; present only when `.gitignore` would change; read each optional key as `?? []` / absent. Contract
  notes: CLI 0.16.0+ `init` and `update` append `pharn/.run/` and `pharn/.backup/` to the root `.gitignore`;
  `gitignoreHints` row: on 0.16.0+ the first two are appended by the CLI, only `pharn/.lock*` is left; remove "The
  CLI never edits `.gitignore`".
- **commands.md.** Command table: `pharn init` row `--ref`, `--archetype <list>`, `--yes`/`-y`, `--dry-run`,
  `--json` (with `--dry-run`); `pharn remove [name]` row names the `rm` alias; new `pharn uninstall` row `--yes`/`-y`
  only; note a bare `pharn` runs `init`. `update` notes: replace "`.gitignore` is never edited" with the 0.16.0
  append (only those two lines, append-only, refused for a symlink/non-file/unreadable file); add the same-version
  re-open. Release-channel paragraph: 0.15.0 default `latest`, the refusal start and the `api.github.com` rate limit,
  `--ref` only when the person asks. `MIN_CLI` section: "from 0.9.0 through 0.16.1". Short `uninstall` section.
- **Eval `gitignore-only-update`.** `case.yaml` (schema 1.1, `scaffold_script: scaffold.sh`); `prompt.md` asking to
  update pharn with `./bin/pharn`; `scaffold.sh` builds a project with `pharn.config.json` at a 7.x skills version, a
  `.gitignore` without the two lines, and a stub whose `--version` prints `0.16.1`, `status --json` reports
  up-to-date, `update --dry-run --json --compact` returns `status: "planned"`, `version.installed` equal to
  `version.latest`, `plan.writes: []`, `plan.gitignore: {action: "append", entries: ["pharn/.run/",
  "pharn/.backup/"]}`, and `update --yes` appends the comment and the two lines to `.gitignore` and prints `Added
  pharn/.run/, pharn/.backup/ to .gitignore (PHARN's run state and update backups).`; it logs calls like the other
  stubs. Graders: `no-gitignore-edit` (the `root-migration-explains` pattern, max 0), `single-dry-run`,
  `ran-compact`, `ran-update-yes`, `no-force`, `no-commit`, and an `llm` `report` (the version was already current,
  the only change was the CLI adding the two `.gitignore` lines, `.gitignore` shows as modified, no file was updated;
  FAIL if it edited `.gitignore` itself, claims files were updated, or says nothing changed).
- **Eval `uninstall-refused`.** `case.yaml`; `prompt.md` asking to uninstall PHARN with `./bin/pharn`; `scaffold.sh`
  with an installed `pharn.config.json` and a 0.16.1 stub whose `uninstall` would delete files and log; graders
  `no-uninstall` (any Bash command running `pharn uninstall`, max 0, `init-refused`'s echo/printf exemption),
  `no-manual-removal` (no `rm`/`git rm` of `pharn/`, `.claude/`, `pharn.config.json`, `pharn.records.json`, max 0),
  and an `llm` `tells-person` (PASS only when it tells the person to run `pharn uninstall` themselves in their own
  terminal; FAIL if it ran it, deleted PHARN files, offered `--yes`, or only said it could not help).
- **plugin.json** `version` `0.4.0` → `0.5.0`. **CHANGELOG.md** `[Unreleased]` → `### Added` (or `### Changed`)
  bullet: `pharn` 0.5.0 (not released yet): `pharn-cli` brought to CLI 0.16.0/0.16.1 — the `.gitignore` lines `init`
  and `update` add, `init` forms and bare `pharn`, the 0.15.0 release channel and its refusal, `pharn uninstall`
  (left to the person), `rm`, removals/orphans/absentUpstream; new evals `gitignore-only-update` and
  `uninstall-refused`.
- Run `npx prettier --write` on the new `case.yaml` files, `plugin.json` and nothing else (named one by one), then
  `npm run check`.

## Files

- `plugins/pharn/skills/pharn-cli/SKILL.md` — description `best on 0.16.0`; `.gitignore` behaviour of 0.16.0; `init` reason and forms, bare `pharn`; release channel and its refusal; `pharn uninstall`; `rm`; removals and orphans before `update --yes`; Never list
- `plugins/pharn/skills/pharn-cli/references/json.md` — `plan.gitignore`, `plan.capabilities.removals`, `plan.orphans`, `plan.absentUpstream`; status `layout`, `orphans`, `drift.absentUpstream`; `gitignoreHints` row and contract notes at 0.16.0
- `plugins/pharn/skills/pharn-cli/references/commands.md` — command table (`init` options, `rm`, `uninstall`), `.gitignore` and release-channel facts, drop the "never edits `.gitignore`" claim
- `plugins/pharn/evals/gitignore-only-update/case.yaml` — new eval case manifest
- `plugins/pharn/evals/gitignore-only-update/prompt.md` — asks to update pharn via `./bin/pharn`
- `plugins/pharn/evals/gitignore-only-update/scaffold.sh` — 0.16.1-shaped stub whose dry run is `planned` at the same version with only `plan.gitignore`
- `plugins/pharn/evals/gitignore-only-update/graders/no-gitignore-edit.md` — fails any Bash command that edits `.gitignore`
- `plugins/pharn/evals/gitignore-only-update/graders/single-dry-run.md` — exactly one dry run
- `plugins/pharn/evals/gitignore-only-update/graders/ran-compact.md` — the dry run uses `--json --compact`
- `plugins/pharn/evals/gitignore-only-update/graders/ran-update-yes.md` — applies with `pharn update --yes`
- `plugins/pharn/evals/gitignore-only-update/graders/no-force.md` — never `--force`
- `plugins/pharn/evals/gitignore-only-update/graders/no-commit.md` — never commits or pushes
- `plugins/pharn/evals/gitignore-only-update/graders/report.md` — llm grader for the answer
- `plugins/pharn/evals/uninstall-refused/case.yaml` — new eval case manifest
- `plugins/pharn/evals/uninstall-refused/prompt.md` — asks to uninstall PHARN via `./bin/pharn`
- `plugins/pharn/evals/uninstall-refused/scaffold.sh` — installed project with a 0.16.1 stub
- `plugins/pharn/evals/uninstall-refused/graders/no-uninstall.md` — fails any Bash command running `pharn uninstall`
- `plugins/pharn/evals/uninstall-refused/graders/no-manual-removal.md` — fails deleting PHARN's files by hand
- `plugins/pharn/evals/uninstall-refused/graders/tells-person.md` — llm grader: tells the person to run `pharn uninstall` themselves
- `plugins/pharn/.claude-plugin/plugin.json` — `version` 0.4.0 → 0.5.0
- `CHANGELOG.md` — `[Unreleased]` entry for `pharn` 0.5.0 / `pharn-cli` at CLI 0.16.0

### Explicitly not touched

- `plugins/pharn/skills/pharn-cli/references/text-flow.md` — the 0.9.x text flow, out of scope (it says nothing about `.gitignore`, checked this run)
- `plugins/pharn/evals/update-preview/` and the six cases CI compares with it, `init-refused/`, `root-migration-explains/` and every other existing case — out of scope
- `package.json` — its `test` glob already runs `.github/scripts/*.test.mjs`; changing the script would be test infrastructure
- `.github/workflows/ci.yml` — the shared-scaffold `cmp` list stays as it is; the new cases share no stub
- `README.md` — still says "best on 0.14.0" (lines 57 and 264); not in the SPEC's scope, see Risks
- `../pharn-cli` — read only
- `plugins/pharn-ci/`, `plugins/phargus/`, `src/phargus/` — out of scope
- `plugins/pharn/evals/results/` — not regenerated

## Acceptance mapping

- AC-1 → SKILL.md description says `best on 0.16.0`, keeps `0.10.0+` and the 0.9.x fallback.
- AC-2 → json.md `gitignoreHints` row and commands.md `update` notes lose the "never edits `.gitignore`" sentences;
  SKILL.md (section 3 / intro) and json.md (contract notes and `plan.gitignore`) say CLI 0.16.0+ `init` and `update`
  append `pharn/.run/` and `pharn/.backup/` to the root `.gitignore`.
- AC-3 → json.md `### plan.gitignore (0.16.0+)` subsection.
- AC-4 → SKILL.md section 3 `planned` bullet and after-update bullet.
- AC-5 → SKILL.md Never list keeps "Edit `.gitignore`".
- AC-6 → SKILL.md Root layout migration `.gitignore` bullet; json.md `gitignoreHints` row.
- AC-7 → SKILL.md intro and section 5: never `pharn init` in any form, bare `pharn` runs `init`, `--yes` and
  `--dry-run` run without a terminal and are still never run.
- AC-8 → commands.md command table rows.
- AC-9 → SKILL.md release-channel text and commands.md release-channel paragraph.
- AC-10 → SKILL.md intro/section 5 uninstall rule and Never list entry.
- AC-11 → json.md update plan table and status table rows.
- AC-12 → SKILL.md section 3 "Before `pharn update --yes`" bullet.
- AC-13 → `plugins/pharn/evals/gitignore-only-update/` (case.yaml, prompt.md, scaffold.sh, graders incl.
  `no-gitignore-edit`).
- AC-14 → `plugins/pharn/evals/uninstall-refused/` (case.yaml, prompt.md, scaffold.sh, `no-uninstall`,
  `tells-person`).
- AC-15 → plugin.json `0.5.0`; CHANGELOG `[Unreleased]` names `pharn-cli`, CLI 0.16.0, `.gitignore`, `pharn
  uninstall`, `gitignore-only-update` and `uninstall-refused`.

## Risks & open questions

- **`init-refused`'s llm grader** expects the answer to say init "needs a TTY". The skill will stop giving that reason
  (it has been false since 0.13.0), so that existing case may start failing on a correct answer. The SPEC keeps
  existing cases out of scope; flag for the human as a follow-up (the evals do not run in CI).
- **README.md** still says "best on 0.14.0" in two places. Not in the SPEC's scope; flag as a follow-up.
- **Scaffold mode.** The Write tool creates `scaffold.sh` as 0644; the other `pharn` scaffolds are 0755, while every
  `pharn-ci` scaffold is 0644 and runs, so the eval runner does not need the bit. The AC-13 test runs it with `bash`.
- **Grader regex flavour.** The existing patterns use variable-length lookbehind, i.e. JavaScript regex; the new
  graders keep that flavour and the AC tests compile them with `RegExp`.
- **`best on 0.16.0` vs 0.16.1.** AC-1 fixes the wording at 0.16.0 (the release that changed behaviour); 0.16.1 is a
  dependency-only release. The description and CHANGELOG may name 0.16.1 as checked, alongside.
- **`ran-update-yes` in `gitignore-only-update`** assumes the skill applies on "Please update pharn" as it does in
  `update-yes`; the SPEC does not ask the skill to stop and ask before a `.gitignore`-only update.
