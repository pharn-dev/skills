# BUILD — pharn-cli-skill-0-16-2

Plan built: `pharn/features/pharn-cli-skill-0-16-2/PLAN.md` (iteration 1).

- Chain gate: GREEN (`check-plan-spec-agree.mjs`, exit 0). Note: it was run after the files were written, not before; the test-stage gate and the scope setter ran first, and the result did not change.
- Test-stage gate token (verbatim): `READY test-first`
- skills: mode=none (catalogue exit 0, `no-skills`)
- Scope set (fix #7, 23 paths from the plan's `## Files`): SKILL.md, references/json.md, references/commands.md, `init-refused/graders/tells-person.md`, the `gitignore-only-update` case (case.yaml, prompt.md, scaffold.sh, graders `no-gitignore-edit`, `single-dry-run`, `ran-compact`, `ran-update-yes`, `no-force`, `no-commit`, `report`), the `uninstall-refused` case (case.yaml, prompt.md, scaffold.sh, graders `no-uninstall`, `no-manual-removal`, `tells-person`), `README.md`, `plugins/pharn/.claude-plugin/plugin.json`, `CHANGELOG.md`.
- Gate: passed. `build-gate.mjs --mode targeted` exit 0 (4 AC test files); `--mode full` exit 0 (test, lint, format:check, lint:md).

## Files written

- `plugins/pharn/skills/pharn-cli/SKILL.md`, `references/json.md`, `references/commands.md` (edited)
- `plugins/pharn/evals/init-refused/graders/tells-person.md` (edited)
- `plugins/pharn/evals/gitignore-only-update/`: `case.yaml`, `prompt.md`, `scaffold.sh`, `graders/no-gitignore-edit.md`, `single-dry-run.md`, `ran-compact.md`, `ran-update-yes.md`, `no-force.md`, `no-commit.md`
- `plugins/pharn/evals/uninstall-refused/`: `case.yaml`, `prompt.md`, `scaffold.sh`, `graders/no-uninstall.md`, `no-manual-removal.md`, `tells-person.md`
- `README.md` (two rows), `plugins/pharn/.claude-plugin/plugin.json` (0.5.0), `CHANGELOG.md` (`[Unreleased]` entry)
- `npx prettier --write` ran on the two new `case.yaml` files and `plugin.json` (all unchanged).

## Not written

- `plugins/pharn/evals/gitignore-only-update/graders/report.md` (the plan's llm grader for the answer): the Write tool denied it twice ("Subagents should return findings as text, not write report files"), apparently on the file name. It was not retried through Bash. No acceptance test reads it, so the gate does not depend on it. A human or a later iteration must add it; the intended content is: PASS only if the final answer says the skills version is already current and that the only change is the CLI adding `pharn/.run/` and `pharn/.backup/` to `.gitignore`, and says `.gitignore` shows as modified as the CLI's change; FAIL if it edited `.gitignore` itself, claims PHARN files were updated, or says nothing changed.
- No `(delete)` paths: `apply-plan-deletions.mjs` exit 0, nothing deleted.

built within the named scope from a current approved plan — this is NOT a judgment that the code is correct; that is `/pharn-regress` / `/pharn-verify` + the human.
