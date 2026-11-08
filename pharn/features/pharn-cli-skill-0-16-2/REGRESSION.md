# REGRESSION — pharn-cli-skill-0-16-2

base: `d8b6d2bcd5de4426e07dba841bf5e8d4a941ad34` — chosen by: named with --base

**verdict: NO REGRESSIONS** — no deterministically-detectable breakage outside the feature.

BASE evidence: produced by this invocation (not reused: `other-run`; entry evidence not used: `start-dirty`); recorded for reuse by a later /pharn-regress of this run.

install:

```text
npm ci
```

HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json`. That `node_modules` holds those packages is not itself checked (install-drift-core.mjs).

## Scope

inside (38):

```text
CHANGELOG.md
README.md
plugins/pharn/.claude-plugin/plugin.json
plugins/pharn/evals/init-refused/graders/tells-person.md
plugins/pharn/skills/pharn-cli/SKILL.md
plugins/pharn/skills/pharn-cli/references/commands.md
plugins/pharn/skills/pharn-cli/references/json.md
.github/scripts/ac-pharn-cli-0-16-2-evals.test.mjs
.github/scripts/ac-pharn-cli-0-16-2-references.test.mjs
.github/scripts/ac-pharn-cli-0-16-2-release.test.mjs
.github/scripts/ac-pharn-cli-0-16-2-skill.test.mjs
pharn/features/pharn-cli-skill-0-16-2/AC-TESTS.lock.json
pharn/features/pharn-cli-skill-0-16-2/AC-TESTS.md
pharn/features/pharn-cli-skill-0-16-2/BUILD.md
pharn/features/pharn-cli-skill-0-16-2/GRILL.md
pharn/features/pharn-cli-skill-0-16-2/PLAN.md
pharn/features/pharn-cli-skill-0-16-2/SPEC.md
pharn/features/pharn-cli-skill-0-16/GRILL.md
pharn/features/pharn-cli-skill-0-16/LOOP.md
pharn/features/pharn-cli-skill-0-16/PLAN.md
pharn/features/pharn-cli-skill-0-16/RUN-REPORT.md
pharn/features/pharn-cli-skill-0-16/SPEC.md
pharn/features/pharn-cli-skill-0-16/cost.json
plugins/pharn/evals/gitignore-only-update/case.yaml
plugins/pharn/evals/gitignore-only-update/graders/no-commit.md
plugins/pharn/evals/gitignore-only-update/graders/no-force.md
plugins/pharn/evals/gitignore-only-update/graders/no-gitignore-edit.md
plugins/pharn/evals/gitignore-only-update/graders/ran-compact.md
plugins/pharn/evals/gitignore-only-update/graders/ran-update-yes.md
plugins/pharn/evals/gitignore-only-update/graders/single-dry-run.md
plugins/pharn/evals/gitignore-only-update/prompt.md
plugins/pharn/evals/gitignore-only-update/scaffold.sh
plugins/pharn/evals/uninstall-refused/case.yaml
plugins/pharn/evals/uninstall-refused/graders/no-manual-removal.md
plugins/pharn/evals/uninstall-refused/graders/no-uninstall.md
plugins/pharn/evals/uninstall-refused/graders/tells-person.md
plugins/pharn/evals/uninstall-refused/prompt.md
plugins/pharn/evals/uninstall-refused/scaffold.sh
```

declared (27):

```text
plugins/pharn/skills/pharn-cli/SKILL.md
plugins/pharn/skills/pharn-cli/references/json.md
plugins/pharn/skills/pharn-cli/references/commands.md
plugins/pharn/evals/init-refused/graders/tells-person.md
plugins/pharn/evals/gitignore-only-update/case.yaml
plugins/pharn/evals/gitignore-only-update/prompt.md
plugins/pharn/evals/gitignore-only-update/scaffold.sh
plugins/pharn/evals/gitignore-only-update/graders/no-gitignore-edit.md
plugins/pharn/evals/gitignore-only-update/graders/single-dry-run.md
plugins/pharn/evals/gitignore-only-update/graders/ran-compact.md
plugins/pharn/evals/gitignore-only-update/graders/ran-update-yes.md
plugins/pharn/evals/gitignore-only-update/graders/no-force.md
plugins/pharn/evals/gitignore-only-update/graders/no-commit.md
plugins/pharn/evals/gitignore-only-update/graders/report.md
plugins/pharn/evals/uninstall-refused/case.yaml
plugins/pharn/evals/uninstall-refused/prompt.md
plugins/pharn/evals/uninstall-refused/scaffold.sh
plugins/pharn/evals/uninstall-refused/graders/no-uninstall.md
plugins/pharn/evals/uninstall-refused/graders/no-manual-removal.md
plugins/pharn/evals/uninstall-refused/graders/tells-person.md
README.md
plugins/pharn/.claude-plugin/plugin.json
CHANGELOG.md
.github/scripts/ac-pharn-cli-0-16-2-skill.test.mjs
.github/scripts/ac-pharn-cli-0-16-2-references.test.mjs
.github/scripts/ac-pharn-cli-0-16-2-evals.test.mjs
.github/scripts/ac-pharn-cli-0-16-2-release.test.mjs
```

escape-exempt (6) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:

```text
pharn/features/pharn-cli-skill-0-16-2/AC-TESTS.lock.json
pharn/features/pharn-cli-skill-0-16-2/AC-TESTS.md
pharn/features/pharn-cli-skill-0-16-2/BUILD.md
pharn/features/pharn-cli-skill-0-16-2/GRILL.md
pharn/features/pharn-cli-skill-0-16-2/PLAN.md
pharn/features/pharn-cli-skill-0-16-2/SPEC.md
```

already changed when this run began (6) — the run's pre-run snapshot recorded these with exactly the bytes they hold now, so they are reported, NOT counted as this build's escape (a re-run records an earlier run's escape the same way; pre-run-snapshot-core.mjs states the bounds):

```text
pharn/features/pharn-cli-skill-0-16/GRILL.md
pharn/features/pharn-cli-skill-0-16/LOOP.md
pharn/features/pharn-cli-skill-0-16/PLAN.md
pharn/features/pharn-cli-skill-0-16/RUN-REPORT.md
pharn/features/pharn-cli-skill-0-16/SPEC.md
pharn/features/pharn-cli-skill-0-16/cost.json
```

## Gates

gate: base exit 1 -> head exit 0 — pre-existing (already red at base) — id (quoted, untrusted): test

style gates were SKIPPED (config-touch rule: no shared style config changed in scope).

## Pre-existing and regressions

pre_existing (1): test
regressions (0): (none)

_/pharn-regress catches exactly what the project's own deterministic suite catches, nothing more — but deterministically. This is not a claim that nothing broke._
