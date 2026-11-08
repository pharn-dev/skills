# REGRESSION — pharn-ci-explain-policy-current

base: `d8b6d2bcd5de4426e07dba841bf5e8d4a941ad34` — chosen by: named with --base

**verdict: NO REGRESSIONS** — no deterministically-detectable breakage outside the feature.

BASE evidence: REUSED — the run marker, the reuse record, the stamp and its logs agree with this invocation's BASE requirement (sha256 `02306e162d9f0c5fa1a49cff83b15f2eb813ac14989861a0fac80c1ea436f250`; that an earlier /pharn-regress of this run produced them is advisory), so this invocation created no base worktree, ran no install and ran no base gate; `gate_run.base.stamp_sha256` in regression-report.json names the stamp.

install: none run by this invocation (the BASE evidence was reused).

HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json` (166 absent dev/peer/optional package(s) not counted). That `node_modules` holds those packages is not itself checked (install-drift-core.mjs).

## Scope

inside (47):

```text
plugins/pharn-ci/evals/fixtures/manifest.json
plugins/pharn-ci/skills/pharn-ci-cover/references/report.md
plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md
plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md
plugins/pharn-ci/skills/pharn-ci-explain/references/policy.md
plugins/pharn-ci/skills/pharn-ci-explain/references/report.md
plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md
plugins/pharn-ci/skills/pharn-ci-policy/references/enable.md
plugins/pharn-ci/skills/pharn-ci-policy/references/keys.md
plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs
plugins/pharn-ci/skills/pharn-ci-policy/scripts/policy.v1.json
plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs
plugins/pharn-ci/tests/ac-0-4-5-policy-skill.test.mjs
plugins/pharn-ci/tests/check-policy.test.mjs
plugins/pharn-ci/tests/pins.test.mjs
pharn/features/pharn-ci-explain-policy-current/AC-TESTS.lock.json
pharn/features/pharn-ci-explain-policy-current/AC-TESTS.md
pharn/features/pharn-ci-explain-policy-current/BUILD.md
pharn/features/pharn-ci-explain-policy-current/GRILL.md
pharn/features/pharn-ci-explain-policy-current/PLAN.md
pharn/features/pharn-ci-explain-policy-current/SPEC.md
pharn/features/pharn-ci-explain-policy-current/VERIFY.md
pharn/features/pharn-ci-explain-policy-current/verify-report.json
plugins/pharn-ci/evals/explain-dependency-d05/case.yaml
plugins/pharn-ci/evals/explain-dependency-d05/graders/answer.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/loads-skill.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-commit.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-edit.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-gh-writes.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-label-command.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-write.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/ran-gh.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-github-workflows-pharn-ci-yml.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-json.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-lock-json.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-pharn-ci-yml.md
plugins/pharn-ci/evals/explain-dependency-d05/prompt.md
plugins/pharn-ci/evals/explain-dependency-d05/scaffold.sh
plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-d05.json
plugins/pharn-ci/tests/ac-0-9-1-descriptions.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-drift.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-eval.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-explain.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-policy.test.mjs
plugins/pharn-ci/tests/fixtures/report.v2.json
plugins/pharn-ci/tests/lib/schema-drift.mjs
plugins/pharn-ci/tests/schema-drift.test.mjs
```

declared (39):

```text
plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md
plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md
plugins/pharn-ci/skills/pharn-ci-explain/references/policy.md
plugins/pharn-ci/skills/pharn-ci-explain/references/report.md
plugins/pharn-ci/skills/pharn-ci-cover/references/report.md
plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md
plugins/pharn-ci/skills/pharn-ci-policy/references/keys.md
plugins/pharn-ci/skills/pharn-ci-policy/references/enable.md
plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs
plugins/pharn-ci/skills/pharn-ci-policy/scripts/policy.v1.json
plugins/pharn-ci/tests/fixtures/report.v2.json
plugins/pharn-ci/tests/lib/schema-drift.mjs
plugins/pharn-ci/tests/schema-drift.test.mjs
plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs
plugins/pharn-ci/tests/check-policy.test.mjs
plugins/pharn-ci/tests/pins.test.mjs
plugins/pharn-ci/tests/ac-0-4-5-policy-skill.test.mjs
plugins/pharn-ci/evals/explain-dependency-d05/case.yaml
plugins/pharn-ci/evals/explain-dependency-d05/prompt.md
plugins/pharn-ci/evals/explain-dependency-d05/scaffold.sh
plugins/pharn-ci/evals/explain-dependency-d05/graders/answer.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/loads-skill.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/ran-gh.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-gh-writes.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-label-command.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-edit.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-write.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/no-commit.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-json.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-lock-json.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-pharn-ci-yml.md
plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-github-workflows-pharn-ci-yml.md
plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-d05.json
plugins/pharn-ci/evals/fixtures/manifest.json
plugins/pharn-ci/tests/ac-0-9-1-descriptions.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-explain.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-eval.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-policy.test.mjs
plugins/pharn-ci/tests/ac-0-9-1-drift.test.mjs
```

escape-exempt (8) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:

```text
pharn/features/pharn-ci-explain-policy-current/AC-TESTS.lock.json
pharn/features/pharn-ci-explain-policy-current/AC-TESTS.md
pharn/features/pharn-ci-explain-policy-current/BUILD.md
pharn/features/pharn-ci-explain-policy-current/GRILL.md
pharn/features/pharn-ci-explain-policy-current/PLAN.md
pharn/features/pharn-ci-explain-policy-current/SPEC.md
pharn/features/pharn-ci-explain-policy-current/VERIFY.md
pharn/features/pharn-ci-explain-policy-current/verify-report.json
```

pre-run snapshot: applied — no undeclared path was already changed when this run began.

## Gates

gate: base exit 1 -> head exit 1 — pre-existing (already red at base) — id (quoted, untrusted): test

style gates were SKIPPED (config-touch rule: no shared style config changed in scope).

## Pre-existing and regressions

pre_existing (1): test
regressions (0): (none)

_/pharn-regress catches exactly what the project's own deterministic suite catches, nothing more — but deterministically. This is not a claim that nothing broke._
