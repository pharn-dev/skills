# REGRESSION — phargus-summary-bounded-memory

base: `2f9380a24b29f708bf2f94f0fd7c97671b6e4f84` — chosen by: named with --base

**verdict: NO REGRESSIONS** — no deterministically-detectable breakage outside the feature.

BASE evidence: taken from this run's ENTRY gates — the run marker, the entry offer, the pre-run snapshot, the entry stamp (sha256 `46954916287068c6915f4a84de640969d4e5a0346eea6d11a0676f83f63f0d91`) and its logs agree with this invocation's BASE slots at `2f9380a24b29f708bf2f94f0fd7c97671b6e4f84`, so this invocation created no base worktree, ran no install and spawned no base gate (retained evidence not reused: `no-record`). The base stamp marks every slot `reused` from the entry run (`test`). That they equal what a fresh BASE worktree would give is NOT claimed: the entry gates ran in this tree's real start environment.

install: none run by this invocation (the BASE evidence came from this run's entry gates).

HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json` (166 absent dev/peer/optional package(s) not counted). That `node_modules` holds those packages is not itself checked (install-drift-core.mjs).

## Scope

inside (42):

```text
CHANGELOG.md
plugins/phargus/skills/phargus-diagnose/references/data.md
plugins/phargus/skills/phargus-diagnose/references/tools.md
plugins/phargus/skills/phargus-diagnose/scripts/records.mjs
plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs
plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts
plugins/phargus/skills/phargus-memory/references/data.md
plugins/phargus/skills/phargus-memory/references/tools.md
plugins/phargus/skills/phargus-memory/scripts/records.mjs
plugins/phargus/skills/phargus-memory/scripts/summary.mjs
plugins/phargus/skills/phargus-memory/scripts/types.d.ts
plugins/phargus/skills/phargus-rules/references/data.md
plugins/phargus/skills/phargus-rules/references/tools.md
plugins/phargus/skills/phargus-rules/scripts/records.mjs
plugins/phargus/skills/phargus-rules/scripts/summary.mjs
plugins/phargus/skills/phargus-rules/scripts/types.d.ts
plugins/phargus/skills/phargus-setup/references/data.md
plugins/phargus/skills/phargus-setup/references/tools.md
plugins/phargus/skills/phargus-setup/scripts/records.mjs
plugins/phargus/skills/phargus-setup/scripts/summary.mjs
plugins/phargus/skills/phargus-setup/scripts/types.d.ts
plugins/phargus/skills/phargus-verify/references/data.md
plugins/phargus/skills/phargus-verify/references/tools.md
plugins/phargus/skills/phargus-verify/scripts/records.mjs
plugins/phargus/skills/phargus-verify/scripts/summary.mjs
plugins/phargus/skills/phargus-verify/scripts/types.d.ts
src/phargus/knowledge/data.md
src/phargus/knowledge/tools.md
src/phargus/runtime/records.mjs
src/phargus/runtime/summary.mjs
src/phargus/runtime/types.d.ts
pharn/features/phargus-summary-bounded-memory/AC-TESTS.lock.json
pharn/features/phargus-summary-bounded-memory/AC-TESTS.md
pharn/features/phargus-summary-bounded-memory/BUILD.md
pharn/features/phargus-summary-bounded-memory/GRILL.md
pharn/features/phargus-summary-bounded-memory/PLAN.md
pharn/features/phargus-summary-bounded-memory/SPEC.md
pharn/features/phargus-summary-bounded-memory/grill-findings.json
pharn/features/phargus-summary-bounded-memory/grill-triage.json
src/phargus/test/route-cap-docs.test.mjs
src/phargus/test/summary-bounded-memory.test.mjs
src/phargus/test/summary-route-cap.test.mjs
```

declared (34):

```text
src/phargus/runtime/summary.mjs
src/phargus/runtime/records.mjs
src/phargus/runtime/types.d.ts
src/phargus/knowledge/data.md
src/phargus/knowledge/tools.md
plugins/phargus/skills/phargus-setup/scripts/summary.mjs
plugins/phargus/skills/phargus-setup/scripts/records.mjs
plugins/phargus/skills/phargus-setup/scripts/types.d.ts
plugins/phargus/skills/phargus-setup/references/data.md
plugins/phargus/skills/phargus-setup/references/tools.md
plugins/phargus/skills/phargus-diagnose/scripts/summary.mjs
plugins/phargus/skills/phargus-diagnose/scripts/records.mjs
plugins/phargus/skills/phargus-diagnose/scripts/types.d.ts
plugins/phargus/skills/phargus-diagnose/references/data.md
plugins/phargus/skills/phargus-diagnose/references/tools.md
plugins/phargus/skills/phargus-verify/scripts/summary.mjs
plugins/phargus/skills/phargus-verify/scripts/records.mjs
plugins/phargus/skills/phargus-verify/scripts/types.d.ts
plugins/phargus/skills/phargus-verify/references/data.md
plugins/phargus/skills/phargus-verify/references/tools.md
plugins/phargus/skills/phargus-memory/scripts/summary.mjs
plugins/phargus/skills/phargus-memory/scripts/records.mjs
plugins/phargus/skills/phargus-memory/scripts/types.d.ts
plugins/phargus/skills/phargus-memory/references/data.md
plugins/phargus/skills/phargus-memory/references/tools.md
plugins/phargus/skills/phargus-rules/scripts/summary.mjs
plugins/phargus/skills/phargus-rules/scripts/records.mjs
plugins/phargus/skills/phargus-rules/scripts/types.d.ts
plugins/phargus/skills/phargus-rules/references/data.md
plugins/phargus/skills/phargus-rules/references/tools.md
CHANGELOG.md
src/phargus/test/summary-route-cap.test.mjs
src/phargus/test/summary-bounded-memory.test.mjs
src/phargus/test/route-cap-docs.test.mjs
```

escape-exempt (8) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:

```text
pharn/features/phargus-summary-bounded-memory/AC-TESTS.lock.json
pharn/features/phargus-summary-bounded-memory/AC-TESTS.md
pharn/features/phargus-summary-bounded-memory/BUILD.md
pharn/features/phargus-summary-bounded-memory/GRILL.md
pharn/features/phargus-summary-bounded-memory/PLAN.md
pharn/features/phargus-summary-bounded-memory/SPEC.md
pharn/features/phargus-summary-bounded-memory/grill-findings.json
pharn/features/phargus-summary-bounded-memory/grill-triage.json
```

pre-run snapshot: applied — no undeclared path was already changed when this run began.

## Gates

gate: base exit 0 -> head exit 0 — ok — id (quoted, untrusted): test

style gates were SKIPPED (config-touch rule: no shared style config changed in scope).

## Pre-existing and regressions

pre_existing (0): (none)
regressions (0): (none)

_/pharn-regress catches exactly what the project's own deterministic suite catches, nothing more — but deterministically. This is not a claim that nothing broke._
