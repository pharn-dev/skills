# REGRESSION — pharn-ci-fix-skill

base: `e4b230aa560c8a409a251d7e9f917416b2294844` — chosen by: named with --base

**verdict: NO REGRESSIONS** — no deterministically-detectable breakage outside the feature.

BASE evidence: produced by this invocation (not reused: `other-run`; entry evidence not used: `shape-mismatch`); recorded for reuse by a later /pharn-regress of this run.

install:

```text
npm ci
```

HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json`. That `node_modules` holds those packages is not itself checked (install-drift-core.mjs).

## Scope

inside (15):

```text
CHANGELOG.md
README.md
plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs
pharn/features/pharn-ci-fix-skill/AC-TESTS.lock.json
pharn/features/pharn-ci-fix-skill/AC-TESTS.md
pharn/features/pharn-ci-fix-skill/BUILD.md
pharn/features/pharn-ci-fix-skill/GRILL.md
pharn/features/pharn-ci-fix-skill/PLAN.md
pharn/features/pharn-ci-fix-skill/SPEC.md
plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md
plugins/pharn-ci/skills/pharn-ci-fix/references/kinds.md
plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs
plugins/pharn-ci/tests/ac-fix-docs.test.mjs
plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs
plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs
```

declared (9):

```text
plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md
plugins/pharn-ci/skills/pharn-ci-fix/references/kinds.md
plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs
plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs
README.md
CHANGELOG.md
plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs
plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs
plugins/pharn-ci/tests/ac-fix-docs.test.mjs
```

escape-exempt (6) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:

```text
pharn/features/pharn-ci-fix-skill/AC-TESTS.lock.json
pharn/features/pharn-ci-fix-skill/AC-TESTS.md
pharn/features/pharn-ci-fix-skill/BUILD.md
pharn/features/pharn-ci-fix-skill/GRILL.md
pharn/features/pharn-ci-fix-skill/PLAN.md
pharn/features/pharn-ci-fix-skill/SPEC.md
```

pre-run snapshot: applied — no undeclared path was already changed when this run began.

## Gates

gate: base exit 1 -> head exit 0 — pre-existing (already red at base) — id (quoted, untrusted): test

style gates were SKIPPED (config-touch rule: no shared style config changed in scope).

## Pre-existing and regressions

pre_existing (1): test
regressions (0): (none)

_/pharn-regress catches exactly what the project's own deterministic suite catches, nothing more — but deterministically. This is not a claim that nothing broke._
