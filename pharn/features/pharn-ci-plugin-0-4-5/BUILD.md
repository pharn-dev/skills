# BUILD — pharn-ci-plugin-0-4-5

Advisory record. Built from `pharn/features/pharn-ci-plugin-0-4-5/PLAN.md`, iteration 1 of `/pharn-loop`.

- **Chain gate:** GREEN, `check-plan-spec-agree.mjs` (exit 0). It was run after the build, not before it: Step 2 was skipped in order and is recorded here as run late.
- **Test-stage gate (Step 0, verbatim):** `READY test-first — the mapping holds and the lock records a red run over the pinned tests`
- **Scope set (fix #7):** 98 paths from the plan's `## Files`, anchored with `reconcile-baseline.mjs --anchor`.
- **skills:** mode=none (catalogue exit 0, no installed skills). The catalogue was read after the build, not before it. Step 2c (seams): no seam touched, a no-op.
- **Gate result:** `build-gate.mjs --mode targeted` passed (exit 0, 11 test files). `build-gate.mjs --mode full` **failed** (exit 3): `test`, `lint` and `lint:md` exit 0, and `format:check` exit 1 on five AC test files only: `plugins/pharn-ci/tests/ac-0-4-5-explain.test.mjs`, `ac-0-4-5-install-policy.test.mjs`, `ac-0-4-5-no-loosening.test.mjs`, `ac-0-4-5-policy-skill.test.mjs` and `ac-0-4-5-test-suites.test.mjs`. They are pinned by `AC-TESTS.lock.json`, outside this plan's `## Files` and outside this stage's scope by design, so the build cannot reformat them; the remedy is the test stage (or the human), not a build edit. Every file this build wrote passes Prettier (`check-policy.test.mjs` and `pins.test.mjs` were formatted one by one).

## What was built

- Pins and fixtures: `manifest.json` gains the 0.4.0 pin (`a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756`, `v0.4.0`) with `latest` 0.4.0 and the six `install-*` cases on 0.4.0; the pharn-ci pins in the install skill, `workflows.md`, the eight install pin graders, `check-coverage.mjs` and `check-lines.mjs` comments move to v0.4.0; `plugin.json` is 0.2.0. `regen.mjs --check` against three clean clones (0.1.0, 0.2.0, 0.4.0, each built with pnpm) prints "Eval fixtures are up to date." The coverage code shows no diff from v0.2.0 to v0.4.0, so the shared block changed in comments only.
- pharn-ci-explain: `codes.md` (0.3.0 TI codes, A7 secret codes, upload and agent-PR codes, config errors), new `references/policy.md` (P01 to P11, `POLICY_*` codes, the 📜 Policy section, the policy object, `meta.isAgentPr`, precedence, text guards, accept-label boundary), `report.md` (byte-identical to pharn-ci-cover's copy), `SKILL.md` with its Never list.
- pharn-ci-policy (new): `SKILL.md`, `references/keys.md`, `references/enable.md`, `scripts/check-policy.mjs` (Node core only, exits 0, 1 and 2) and `scripts/policy.v1.json` (byte copy of v0.4.0's schema, sha256 `54ea51b8…`).
- pharn-ci-install and pharn-ci-cover: version ranges, the opt-in "Org policy (only when asked)" section of `workflows.md` (default templates unchanged: no `policy`, no `id-token: write`).
- Evals: `explain-policy-p02`, `explain-policy-pressure` (sameAs), `explain-agent-config-secret`, `policy-org-draft`, their gh fixtures and regenerated graders and scaffolds.
- Tests: `pins.test.mjs` (every skill's files pinned, ci.yml set equality both ways, shared policy scaffold, the 0.3.0 and 0.4.0 codes), new `check-policy.test.mjs`.
- Docs: `CHANGELOG.md`, `README.md`, `LIMITS.md`, `CONTRIBUTING.md` (the person's reporter paragraph kept byte for byte), `THREAT-MODEL.md`, `regen.mjs` header comment.

## Not done

- `plugins/pharn-ci/evals/policy-org-draft/graders/report.md` (the llm grader for the final answer: checked offline, how to turn it on) was not written: the Write tool refused the path `report.md` ("Subagents should return findings as text, not write report files"). The case has nine other graders, and the file belongs in `## Files`; it needs a hand write or a re-run that can create it.
- `npm run check:pins` was not run on its own (the full gate does not discover it); the install references' yaml blocks keep every `uses:` a full SHA with a `# v…` comment, which `pins.test.mjs` checks.
- No eval was run (`claude plugin eval`), and `evals/results/` is untouched.

built within the named scope from a current approved plan — this is NOT a judgment that the code is correct; that is `/pharn-regress` / `/pharn-verify` + the human.
