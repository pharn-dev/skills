# REGRESSION — collect-rules-gaps-loss

base: `248c0f6cf7571b91993fd98f8ab76eb0dc7ff503` — chosen by: named with --base

**verdict: NO REGRESSIONS** — no deterministically-detectable breakage outside the feature.

BASE evidence: taken from this run's ENTRY gates — the run marker, the entry offer, the pre-run snapshot, the entry stamp (sha256 `1192f3f8bfe46aceab33339a57f4f0511b264c95259fffb65ffcd2ff3d6b60d9`) and its logs agree with this invocation's BASE slots at `248c0f6cf7571b91993fd98f8ab76eb0dc7ff503`, so this invocation created no base worktree, ran no install and spawned no base gate (retained evidence not reused: `no-record`). The base stamp marks every slot `reused` from the entry run (`test`). That they equal what a fresh BASE worktree would give is NOT claimed: the entry gates ran in this tree's real start environment.

install: none run by this invocation (the BASE evidence came from this run's entry gates).

HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json` (166 absent dev/peer/optional package(s) not counted). That `node_modules` holds those packages is not itself checked (install-drift-core.mjs).

## Scope

inside (31):

```text
CHANGELOG.md
plugins/phargus/skills/phargus-diagnose/references/tools.md
plugins/phargus/skills/phargus-diagnose/scripts/operations.mjs
plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs
plugins/phargus/skills/phargus-memory/references/tools.md
plugins/phargus/skills/phargus-memory/scripts/operations.mjs
plugins/phargus/skills/phargus-memory/scripts/phargus.mjs
plugins/phargus/skills/phargus-rules/references/rules.md
plugins/phargus/skills/phargus-rules/references/tools.md
plugins/phargus/skills/phargus-rules/scripts/operations.mjs
plugins/phargus/skills/phargus-rules/scripts/phargus.mjs
plugins/phargus/skills/phargus-setup/references/tools.md
plugins/phargus/skills/phargus-setup/scripts/operations.mjs
plugins/phargus/skills/phargus-setup/scripts/phargus.mjs
plugins/phargus/skills/phargus-verify/references/tools.md
plugins/phargus/skills/phargus-verify/scripts/operations.mjs
plugins/phargus/skills/phargus-verify/scripts/phargus.mjs
src/phargus/knowledge/rules.md
src/phargus/knowledge/tools.md
src/phargus/runtime/operations.mjs
src/phargus/runtime/phargus.mjs
pharn/features/collect-rules-gaps-loss/AC-TESTS.lock.json
pharn/features/collect-rules-gaps-loss/AC-TESTS.md
pharn/features/collect-rules-gaps-loss/BUILD.md
pharn/features/collect-rules-gaps-loss/GRILL.md
pharn/features/collect-rules-gaps-loss/PLAN.md
pharn/features/collect-rules-gaps-loss/SPEC.md
pharn/features/collect-rules-gaps-loss/grill-findings.json
pharn/features/collect-rules-gaps-loss/grill-triage.json
src/phargus/test/collect-rules-quality.test.mjs
src/phargus/test/integration/collect-rules-quality.test.mjs
```

declared (23):

```text
src/phargus/runtime/operations.mjs
src/phargus/runtime/phargus.mjs
src/phargus/knowledge/rules.md
src/phargus/knowledge/tools.md
plugins/phargus/skills/phargus-diagnose/scripts/operations.mjs
plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs
plugins/phargus/skills/phargus-diagnose/references/tools.md
plugins/phargus/skills/phargus-memory/scripts/operations.mjs
plugins/phargus/skills/phargus-memory/scripts/phargus.mjs
plugins/phargus/skills/phargus-memory/references/tools.md
plugins/phargus/skills/phargus-rules/scripts/operations.mjs
plugins/phargus/skills/phargus-rules/scripts/phargus.mjs
plugins/phargus/skills/phargus-rules/references/tools.md
plugins/phargus/skills/phargus-rules/references/rules.md
plugins/phargus/skills/phargus-setup/scripts/operations.mjs
plugins/phargus/skills/phargus-setup/scripts/phargus.mjs
plugins/phargus/skills/phargus-setup/references/tools.md
plugins/phargus/skills/phargus-verify/scripts/operations.mjs
plugins/phargus/skills/phargus-verify/scripts/phargus.mjs
plugins/phargus/skills/phargus-verify/references/tools.md
CHANGELOG.md
src/phargus/test/collect-rules-quality.test.mjs
src/phargus/test/integration/collect-rules-quality.test.mjs
```

escape-exempt (8) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:

```text
pharn/features/collect-rules-gaps-loss/AC-TESTS.lock.json
pharn/features/collect-rules-gaps-loss/AC-TESTS.md
pharn/features/collect-rules-gaps-loss/BUILD.md
pharn/features/collect-rules-gaps-loss/GRILL.md
pharn/features/collect-rules-gaps-loss/PLAN.md
pharn/features/collect-rules-gaps-loss/SPEC.md
pharn/features/collect-rules-gaps-loss/grill-findings.json
pharn/features/collect-rules-gaps-loss/grill-triage.json
```

pre-run snapshot: applied — no undeclared path was already changed when this run began.

## Gates

gate: base exit 0 -> head exit 0 — ok — id (quoted, untrusted): test

style gates were SKIPPED (config-touch rule: no shared style config changed in scope).

## Pre-existing and regressions

pre_existing (0): (none)
regressions (0): (none)

_/pharn-regress catches exactly what the project's own deterministic suite catches, nothing more — but deterministically. This is not a claim that nothing broke._
