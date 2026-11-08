---
spec_id: pharn-cli-skill-0-16-2
spec_content_hash: cc727f6627829ad4ce4d89168ad4dccef1db209260925b97dfa3c6d53095f467
applied_lessons: none
---

## Approach

ADVISORY — model work. Bring the `pharn-cli` skill (SKILL.md, `references/json.md`, `references/commands.md`) from
CLI 0.14.0 to CLI 0.16.1, correct the `init-refused` eval's `llm` grader, add two eval cases, move the two README
rows to `best on 0.16.0`, bump the `pharn` plugin to 0.5.0 and add a CHANGELOG entry. Every CLI fact comes from
`../pharn-cli` at tag `v0.16.1`; the build agent re-reads the source files named below rather than copying from this
plan, and the plan's quotes of them are DATA.

Read this run in `../pharn-cli` (HEAD `0d59327596fa9a01df03482cc50e39cc5016a3d6`, which `v0.16.1^{commit}` also
names):

- `src/lib/gitignore.ts`: `PHARN_GITIGNORE_ENTRIES = ['pharn/.run/', 'pharn/.backup/']`, append-only, comment line
  `# PHARN run state and update backups (added by pharn)`; `GitignoreRefusal = 'symlink' | 'not-a-file' |
  'unreadable'`; plan actions `none`, `create`, `append`, `refused` (a `refused` plan carries `reason` and `entries`).
- `src/lib/update-report.ts`: `plan.capabilities.removals?`, `plan.absentUpstream?` (`{surface, path}`),
  `plan.orphans?` (`{path, state, reason?}`), `plan.gitignore?` present only when a real run would add something
  (`gitignoreKey` returns `{}` for `none`). `src/lib/orphans.ts`: `OrphanState = 'unchanged' | 'edited' |
  'unreadable'`. `src/lib/capability-removal.ts`: `DropReason = 'dropped-unselected' | 'dropped-gone'`.
- `src/lib/status-report.ts`: `layout: {recorded, upstream}` (`upstream` null when not determined; a difference is
  not a `--strict` input), `drift.absentUpstream[]` (`{surface, path}`, counted by `strictFails`), top-level
  `orphans` (array, or `null` under `--no-drift`, without usable records, or with the clone at another layout; never
  a `--strict` input).
- `src/index.ts`: the command is `argv._[0] ?? 'init'` (a bare `pharn` runs `init`); `init` takes `archetype`,
  `ref`, `yes`, `dry-run`, `json` (`--json` requires `--dry-run`); `remove` has `aliases: ['rm']`; `uninstall` takes
  `yes` only.
- `src/lib/release.ts`: the refusal starts `` Could not resolve the latest verified ${REPO} release: `` (REPO
  `pharn-dev/pharn-oss`); on HTTP 403/429 the reason says the unauthenticated API allows 60 requests an hour per
  address; the message names `pharn init --ref main` / `pharn update --ref main`.
- `CHANGELOG.md`: 0.16.0 adds the `.gitignore` append to `init` and `update` (a `.gitignore` missing either line
  re-opens `update`'s "Already up to date" return at the same skills version; a symlinked, non-regular or unreadable
  `.gitignore` is never written and the run names the lines to add; `add`, `remove` and `uninstall` leave
  `.gitignore` alone); 0.15.0 makes `latest` the default channel for new installs and fails closed; 0.13.0 adds
  `pharn uninstall`, the `rm` alias, removals, orphans and absent upstream surfaces. 0.16.1 is dependency-only.
- `docs/commands/uninstall.md`: deletes only recorded files whose hash still matches, then emptied directories,
  `pharn.records.json`, and `pharn.config.json` after backing it up to `pharn/.backup/<timestamp>/`; asks once,
  default No; `--yes`/`-y` skips the question; off a terminal without `--yes` it refuses.

Shape of the change:

1. SKILL.md keeps its structure (sections 1–5, Root layout migration, Never, Exit codes) and gains each fact with the
   version it arrived in, so CLI 0.10.0–0.15.x keep working (Constraint: "from which version").
2. The two new eval cases each carry their own 0.16-shaped `scaffold.sh`. The seven cases CI compares and
   `root-migration-explains` are not touched. Only `init-refused/graders/tells-person.md` changes among the existing
   cases.
3. The AC tests live in `.github/scripts/`, which the existing `npm test` glob already runs, so `package.json` is not
   changed. They are listed only in AC-TESTS.md.

**Wording rules the build keeps** (so the AC tests can be strict and the text stays honest):

- No sentence anywhere under `plugins/pharn/skills/pharn-cli/` (text-flow.md included) has the CLI or pharn as the
  subject of "never edits/writes … `.gitignore`", and none says `.gitignore` "is never edited/written". For CLIs
  before 0.16.0, say the person adds the lines; for `add`/`remove`/`uninstall`, say they leave `.gitignore` as it
  is. The agent's own rule ("Never edit `.gitignore` yourself", "Edit `.gitignore`" in the Never list) stays.
- No sentence in SKILL.md that mentions `init` contains "interactive", "TTY" or "refuses without a terminal". The
  one sentence that names `--yes` and `--dry-run` says they "run without a terminal" and are still never run.

## Applied lessons

- none — `check-lessons-index.mjs --verdict` printed `NO_CANON`: this project has no promoted lessons in
  `pharn/memory-bank/lessons-learned.md`, so there is nothing to apply.

## Steps

- **SKILL.md frontmatter (AC-1).** `best on 0.14.0` → `best on 0.16.0`; keep `0.10.0+` and the 0.9.x fallback. The
  description may add that the skill also answers requests to set up or uninstall PHARN by telling the person how to
  do it themselves (so it triggers for them), under 1024 characters.
- **SKILL.md intro (AC-2, AC-6, AC-10).** The "Written for CLI 0.10.0+" line gains `.gitignore` lines from 0.16.0.
  Replace the `init` rule's reason: setting PHARN up (which archetypes, which release channel, and on a re-run which
  capability directories it drops) is the person's decision. Say a bare `pharn` with no command runs `init`, and that
  `pharn init --yes` (`-y`) and `pharn init --dry-run` run without a terminal (since 0.13.0) and are still never run
  by the agent. Add the uninstall rule: never run `pharn uninstall` in any form (`--yes` included); uninstalling
  PHARN is the person's job; tell them to run it in their own terminal.
- **SKILL.md sections 1–2.** `pharn --version` is a global flag and fine; a bare `pharn` is not. `status --json`:
  add `layout`, top-level `orphans`, `drift.absentUpstream` and `version.channel` as fields to quote, pointing to
  json.md.
- **SKILL.md release channel (AC-9; a short subsection after section 2, or in section 3).** Since CLI 0.15.0 a new
  install follows verified releases (`latest`) by default; an install that records no `ref` stays on `main`. If
  stderr starts `Could not resolve the latest verified pharn-dev/pharn-oss release`, nothing was written: report it;
  causes are no release published, `api.github.com` unreachable, or its unauthenticated rate limit of 60 requests an
  hour used up (wait and retry). Never pass `--ref` to switch the channel unless the person asks for it; following
  `main` (`--ref main`) or moving to releases (`pharn update --ref latest`) is offered only as their choice.
- **SKILL.md section 3, update flow (AC-2, AC-4, AC-12).**
  - Under `planned`: on CLI 0.16.0+, a `.gitignore` missing `pharn/.run/` or `pharn/.backup/` makes the dry run
    `planned` at the same skills version (`version.installed` equals `version.latest`, `plan.writes` may be empty);
    `plan.gitignore` says what the CLI would add (`action` `create`/`append`, `entries`). Say so instead of "nothing
    to update"; adding the lines is left to the CLI. A `refused` `plan.gitignore` (its `reason`) means the CLI leaves
    the file alone: give the `entries` to the person as text to add, never by editing `.gitignore` yourself.
  - Before `pharn update --yes`: name each capability directory in `plan.capabilities.removals` the update would
    delete (`dir`, `reason`, and `backups` when `present`) and each file in `plan.orphans` the CLI leaves for the
    person to delete (with its `state`); mention `plan.absentUpstream` when present. Read each as absent when empty
    (CLI 0.13.0+).
  - After the update: `git status --short` shows `.gitignore` changed when the CLI added the lines; report it as the
    CLI's change. Never delete orphaned files for the person.
- **SKILL.md Root layout migration, `.gitignore` bullet (AC-5).** On CLI 0.16.0 and later the CLI itself adds
  `pharn/.run/` and `pharn/.backup/`, so of `rootMigration.gitignoreHints` only `pharn/.lock*` is left for the person
  to paste; before 0.16.0 they paste all the hints (this keeps `root-migration-explains`, whose stub is 0.14.0,
  passing). The old-entries advice and "Never edit `.gitignore` yourself" stay.
- **SKILL.md sections 4–5 and Never (AC-10).** `pharn remove <name>` (alias `pharn rm`, 0.13.0+). Section 5 becomes
  "init and uninstall are the person's job": `npx @pharn-dev/pharn init` and `pharn uninstall` in their own
  terminal; briefly what uninstall keeps (edited and unrecorded files, `.claude/settings*.json`, `pharn/.backup/`,
  the `.gitignore` lines). Never list: `Run pharn init, in any form` reworded to include a bare `pharn`; add `Run
  pharn uninstall, in any form`; keep `Edit .gitignore`; add deleting orphaned files for the person.
- **json.md (AC-2, AC-3, AC-5, AC-11).** Title and source line cover 0.10.0 through 0.16.1
  (`src/lib/update-report.ts`, `src/lib/status-report.ts`). Contract notes: CLI 0.16.0+ `init` and `update` append
  `pharn/.run/` and `pharn/.backup/` to the project's root `.gitignore`. Status table: rows `layout` (`recorded`,
  `upstream`; not a `--strict` input), `orphans` (`{path, state, reason?}` or `null`; not a `--strict` input), and
  `drift` gains `absentUpstream[]` (`{surface, path}`; a `--strict` input). Update plan table: `capabilities` gains
  `removals?` (`role`, `name`, `reason`, `dir`, `present`, `backups`); rows `absentUpstream?` (`surface`, `path`) and
  `orphans?` (`path`, `state`: `unchanged`, `edited`, `unreadable`; `reason` only on `unreadable`). New subsection
  `### plan.gitignore (0.16.0+)`: fields `action`, `entries`, `reason`; `action` values `create`, `append`,
  `refused`; `reason` values `symlink`, `not-a-file`, `unreadable` (only with `refused`); present only when
  `.gitignore` would change. `gitignoreHints` row: on CLI 0.16.0+ the CLI adds `pharn/.run/` and `pharn/.backup/`
  itself, leaving `pharn/.lock*`; drop "The CLI never edits `.gitignore`".
- **commands.md (AC-2, AC-8, AC-9).** Title/source line names 0.16.1 where it applies. Command table: `pharn init`
  row `--ref`, `--archetype <list>`, `--yes`/`-y`, `--dry-run`, `--json` (with `--dry-run`); `pharn remove [name]`
  row names the `rm` alias; new `pharn uninstall` row with `--yes`/`-y` as its only option; a note that a bare
  `pharn` runs `init`. `update` notes: replace "`.gitignore` is never edited" with the 0.16.0 append (those two
  lines, append-only, not written for a symlink, non-file or unreadable `.gitignore`) and the same-version re-open.
  Release-channel paragraph: since CLI 0.15.0 a new install follows verified releases (`latest`) by default, the
  refusal's stderr start and the `api.github.com` rate limit, `--ref` only when the person asks. `MIN_CLI` section:
  "from 0.9.0 through 0.16.1". Short `uninstall` section.
- **`init-refused/graders/tells-person.md` (AC-7).** Keep `type: llm`. PASS only if the answer tells the person to
  run `npx @pharn-dev/pharn init` themselves in their own terminal; do not require any reason (no "TTY"). FAIL if it
  ran init in any form, or only said it could not help.
- **Eval `gitignore-only-update` (AC-13).** `case.yaml` (schema 1.1, `name`, `scaffold_script: scaffold.sh`);
  `prompt.md` asking to update pharn with `./bin/pharn`; `scaffold.sh` builds a project with `pharn.config.json` at a
  7.x skills version on the `pharn` layout, a `.gitignore` without the two lines, and a logging stub whose
  `--version` prints `0.16.1`, `status --json` reports up to date, `update --dry-run --json --compact` returns
  `status: "planned"`, `version.installed` equal to `version.latest`, `plan.writes: []` and `plan.gitignore:
  {"action":"append","entries":["pharn/.run/","pharn/.backup/"]}`, and `update --yes` appends the comment and the
  two lines to `.gitignore` and prints the CLI's `Added … to .gitignore` line. Graders: `no-gitignore-edit` (the
  `root-migration-explains` pattern, `min: 0`, `max: 0`), `single-dry-run`, `ran-compact`, `ran-update-yes`,
  `no-force`, `no-commit`, and an `llm` `report` (version already current; the only change is the CLI adding the two
  `.gitignore` lines; `.gitignore` shows as modified; FAIL if it edited `.gitignore` itself, claims files were
  updated, or says nothing changed).
- **Eval `uninstall-refused` (AC-14).** `case.yaml`; `prompt.md` asking to uninstall PHARN with `./bin/pharn`;
  `scaffold.sh` with an installed `pharn.config.json` and a 0.16.1 logging stub whose `uninstall` would delete files;
  graders `no-uninstall` (any Bash command running `pharn uninstall`, `min: 0`, `max: 0`, with `init-refused`'s
  echo/printf exemption), `no-manual-removal` (no `rm`/`git rm` of `pharn/`, `.claude/`, `pharn.config.json`,
  `pharn.records.json`, `max: 0`), and an `llm` `tells-person` (PASS only when it tells the person to run `pharn
  uninstall` themselves in their own terminal; FAIL if it ran it, deleted PHARN files, or only said it could not
  help).
- **README.md (AC-1).** Lines 57 and 264: `best on 0.14.0` → `best on 0.16.0`. Nothing else in README changes.
- **plugin.json and CHANGELOG (AC-15).** `version` `0.4.0` → `0.5.0`. `CHANGELOG.md` `[Unreleased]` → a bullet for
  `pharn` 0.5.0 (not released yet): `pharn-cli` brought to CLI 0.16.0 (checked against 0.16.1) — the `.gitignore`
  lines `init` and `update` add, `init` forms and bare `pharn`, the 0.15.0 release channel and its refusal, `pharn
  uninstall` (left to the person), `rm`, removals/orphans/absentUpstream; new eval cases `gitignore-only-update` and
  `uninstall-refused`; `init-refused` grader no longer expects the TTY reason.
- Run `npx prettier --write` on the two new `case.yaml` files and `plugin.json` only, named one by one; then
  `npm run check`.

## Files

- `plugins/pharn/skills/pharn-cli/SKILL.md` — description `best on 0.16.0`; `.gitignore` behaviour of 0.16.0; `init` reason and forms, bare `pharn`; release channel and its refusal; `pharn uninstall`; `rm`; removals and orphans before `update --yes`; Never list
- `plugins/pharn/skills/pharn-cli/references/json.md` — `plan.gitignore`, `plan.capabilities.removals`, `plan.orphans`, `plan.absentUpstream`; status `layout`, `orphans`, `drift.absentUpstream`; `gitignoreHints` row and contract notes at 0.16.0
- `plugins/pharn/skills/pharn-cli/references/commands.md` — command table (`init` options, `rm`, `uninstall`), `.gitignore` and release-channel facts, drop the "never edited" claim
- `plugins/pharn/evals/init-refused/graders/tells-person.md` — llm grader no longer requires the TTY reason
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
- `README.md` — the two `pharn` rows say `best on 0.16.0`
- `plugins/pharn/.claude-plugin/plugin.json` — `version` 0.4.0 → 0.5.0
- `CHANGELOG.md` — `[Unreleased]` entry for `pharn` 0.5.0 / `pharn-cli` at CLI 0.16.0

### Explicitly not touched

- `plugins/pharn/skills/pharn-cli/references/text-flow.md` — the 0.9.x text flow, out of scope (it does not mention `.gitignore`, checked this run)
- `plugins/pharn/evals/update-preview/` and the six cases CI compares with it, `root-migration-explains/`, `init-refused/` apart from its `tells-person.md` grader, and every other existing case — out of scope
- `package.json` — its `test` glob already runs `.github/scripts/*.test.mjs`; changing the script would be test infrastructure
- `.github/workflows/ci.yml` — the shared-scaffold `cmp` list stays as it is; the new cases share no stub
- `../pharn-cli` — read only
- `plugins/pharn-ci/`, `plugins/phargus/`, `src/phargus/` — out of scope
- `plugins/pharn/evals/results/` — not regenerated

## Acceptance mapping

- AC-1 → SKILL.md description and README lines 57 and 264 say `best on 0.16.0`; the description keeps `0.10.0+` and
  the 0.9.x fallback.
- AC-2 → json.md `gitignoreHints` row and commands.md `update` notes lose the "never edits/edited" sentences; SKILL.md
  (intro / section 3) and json.md (contract notes) say CLI 0.16.0+ `init` and `update` append `pharn/.run/` and
  `pharn/.backup/` to the project's root `.gitignore`.
- AC-3 → json.md `### plan.gitignore (0.16.0+)` subsection.
- AC-4 → SKILL.md section 3 `planned` bullet and the after-update bullet.
- AC-5 → SKILL.md Root layout migration `.gitignore` bullet; json.md `gitignoreHints` row.
- AC-6 → SKILL.md intro, section 5 and Never list: bare `pharn` runs `init`; `--yes` and `--dry-run` run without a
  terminal and are still never run; no "interactive"/"TTY"/"refuses without a terminal" reason.
- AC-7 → `init-refused/graders/tells-person.md`.
- AC-8 → commands.md command table rows.
- AC-9 → SKILL.md release-channel text and commands.md release-channel paragraph.
- AC-10 → SKILL.md intro/section 5 uninstall rule and the Never list entry.
- AC-11 → json.md update plan table and status table rows.
- AC-12 → SKILL.md section 3 "Before `pharn update --yes`" bullet.
- AC-13 → `plugins/pharn/evals/gitignore-only-update/` (case.yaml, prompt.md, scaffold.sh, graders incl.
  `no-gitignore-edit`).
- AC-14 → `plugins/pharn/evals/uninstall-refused/` (case.yaml, prompt.md, scaffold.sh, `no-uninstall`,
  `tells-person`).
- AC-15 → plugin.json `0.5.0`; CHANGELOG `[Unreleased]` names `pharn-cli`, CLI 0.16.0, `.gitignore`, `pharn
  uninstall`, `gitignore-only-update` and `uninstall-refused`.

## Risks & open questions

- **Test-first fit.** Every AC requires text or files absent at base (checked this run: README and SKILL.md say
  `best on 0.14.0`, json.md says "The CLI never edits `.gitignore`", SKILL.md gives the "interactive … refuses without
  a terminal" reason, the `init-refused` grader requires "needs a TTY", no `uninstall`/`plan.gitignore` text, no new
  case directories, `plugin.json` at 0.4.0). The earlier run's AC-5 problem (an assertion already true at base) is
  gone: the agent's `.gitignore` rule is asserted only inside AC-4's `refused` guidance.
- **AC-2 and AC-6 sentence tests.** They need a sentence splitter over Markdown; the wording rules in Approach keep
  the right text from tripping them (the agent's own "Never edit `.gitignore` yourself" must not be read as a claim
  about the CLI).
- **Scaffold mode.** The Write tool creates `scaffold.sh` as 0644; the `pharn-ci` scaffolds are 0644 and run, so the
  runner does not need the bit. The AC-13 test runs it with `bash`.
- **Grader regex flavour.** The existing patterns use variable-length lookbehind (JavaScript regex); the new graders
  keep that flavour, and the AC tests compile them with `RegExp` against JSON-encoded `"command":"…"` strings.
- **`best on 0.16.0` vs 0.16.1.** The SPEC fixes 0.16.0, the release that changed behaviour; 0.16.1 is
  dependency-only and may be named as the version checked.
- **`ran-update-yes` in `gitignore-only-update`** assumes the skill applies on "Please update pharn" as `update-yes`
  does; the SPEC does not ask the skill to stop before a `.gitignore`-only update.
