---
spec_id: pharn-ci-explain-policy-current
spec_content_hash: 3b1d4670117c78151aca3b52de407af256a60fb829c08d18f20e81a6f5a51e04
applied_lessons: none
---

## Approach

> ADVISORY — model work. Facts below were read this run from `~/Projects/pharn-ci` at tag `v0.9.1` (commit
> `dec4a0ed2d0b111233522753909c74a90b6d09e0`, equal to `main` and `origin/main`), exported with `git archive` because
> the local checkout is on another branch with uncommitted edits, and from `v0.4.0` for the comparison.

**What the sources say, and one disagreement with the request.**

- `schema/report.v2.json` has **no enum** for message codes: `$defs.message.properties.code` is a string with the
  pattern `^[A-Z][A-Z0-9_]*$`, and the known codes are listed, with their levels and meanings, in that property's
  `description`. "The code enum" in the SPEC is read as that list. It names 89 codes at v0.9.1 and 65 at v0.4.0;
  the 24 new ones are exactly the request's list: `POLICY_P13`, `POLICY_P14`, `INJECTION_PI01` to `INJECTION_PI05`,
  `INJECTION_TEXT_TRUNCATED`, `SETUP_STALE_SI01` to `SETUP_STALE_SI04`, `TESTS_NOT_EXERCISING_CHANGES`,
  `DEPENDENCY_CHECK_INCOMPLETE`, `DEPENDENCY_D01` to `DEPENDENCY_D05`, `DEPENDENCY_LOOKUP_UNAVAILABLE`,
  `FLAKY_QUARANTINED_FAILURES`, `JUNIT_INVALID`, `JUNIT_NOT_FOUND`, `JUNIT_TOO_LARGE`. The code-like string literals of
  `packages/{core,action,cli}/src` are the same 89 codes (plus Node's own `ERR_*`), so code and schema agree.
- `schema/policy.v1.json`: the only key paths added after 0.4.0 are `dependencies.lookup` and `injection`
  (`exempt`, `phrases`, `signals.PI01` to `PI05`). `flaky.quarantine`, `agents.max_files`, `agents.max_changed_lines`
  and `policy.rules.P13` / `P14` were already in the 0.4.0 schema; only their descriptions changed (P13 and P14 are
  enforced from 0.6.0, the quarantine list is applied from 0.8.0). `settings.uploadJunit` is not a policy key: it is a
  setting in the pharn.dev app's policy response (CHANGELOG 0.5.0 and 0.8.0).
- D05: `packages/core/src/dependencies/urls.ts` `ALLOWED_RESOLVE_HOSTS` is a fixed list (`registry.npmjs.org`,
  `registry.yarnpkg.com`, `pypi.org`, `files.pythonhosted.org`; https, no user name, password or port).
  `dependencies.registries` (`npm`, `pypi`) only chooses which ecosystems are looked up (`settings.ts`, `lookup.ts`).
  `docs/LIMITS.md` "Dependency safety": a private registry a lockfile records (Artifactory, Verdaccio, GitHub
  Packages, a private PyPI index) is D05, and D01, D04 and D05 always block; the org policy cannot change a dependency
  signal's severity. `action.yml` has no `registries` input. No feature under pharn-ci's `pharn/features/` is about
  D05 (the `fix-hints` feature only names the code).
- Fix hints: `$defs.fix` (`kind`, `hint` ≤ 200 characters, `target` never on a message); `fix/table.ts` uses all eight
  kinds; `fix/attach.ts` adds `fix` to messages and to the findings of `testIntegrity.signals`, `policy.violations`,
  `setupHealth.stale`, `injection.signals` and `dependencies.signals`; the CHANGELOG 0.9.0 says verdicts, inputs and
  the PR comment are unchanged.

**How it is built.** Edit the two skills in place, in their own voice, adding sections rather than rewriting:

1. `pharn-ci-explain/references/codes.md`: title and source line move to 0.1.x to 0.9.x at v0.9.1. A new
   "Behaviour changes 0.5.0 to 0.9.1" section near the top lists, per version, the CHANGELOG's behaviour changes
   (0.5.0: the `fail-on-threshold` input renamed `fail-on-verdict`, the old name still read with a warning;
   `DIFF_UNAVAILABLE` and `TEST_INTEGRITY_INDEX_UNAVAILABLE` errors in `block`; unreadable settings and MCP files
   `POLICY_SETTINGS_INVALID` errors; TI03 and TI09 tightenings; 0.6.0: `.pharn/ci.yml` threshold and `setup.require`
   tighten-only; 0.7.0: PI01 blocks by default, `TESTS_NOT_EXERCISING_CHANGES` gives a `warn` verdict; 0.8.0:
   dependency safety on by default, D04 and D05 block). New `###` sections, one per code with its default level in
   the heading, for SI01 to SI04, PI01 to PI05 and `INJECTION_TEXT_TRUNCATED`, `TESTS_NOT_EXERCISING_CHANGES`, D01 to D05
   and the two dependency status codes, and the JUnit / flaky codes; each says what it means, what to look at and the
   honest fix. The "Org policy codes" paragraph names every `POLICY_*` code one by one (P13 and P14 included), so every
   code of the schema's list is named in `codes.md`. The pharn-ci error table gains the 0.5.0 to 0.9.0 input errors the
   README and `action.yml` name.
2. `pharn-ci-explain/references/policy.md`: rules P01 to P14, with P13 (agent self-modification) and P14 (agent PR
   size cap) rows and `###` sections, P12 named as not enforced, and the precedence section updated for 0.6.0.
3. `pharn-ci-explain/references/report.md` (and its byte copy in `pharn-ci-cover`): version lines to 0.9.x, rows for
   `injection`, `setupHealth.stale`, `testIntegrity.exercise`, `dependencies`, `flaky` and `fix`, the four new comment
   sections, the eight kinds, and the sentences that `fix` never changes a verdict and is in `report.json` only.
4. `pharn-ci-explain/SKILL.md`: description range `0.1.x to 0.9.x`; body version lines; "Read the verdict" bullets for
   📄 Instructions, 🧬 Content, 📦 Dependencies and 🧫 Flaky; "Answer" guidance for injection and dependency findings;
   `fail-on-verdict` in the weaken list; "Never" bullets for `dependencies: never`, `injection.exempt`, a quarantine
   entry, and repeating an injection finding's content.
5. `pharn-ci-policy`: `scripts/policy.v1.json` replaced by v0.9.1's byte copy (sha256
   `8dcd0f6971d89808deea68d3e5d24ced01ecd9a37b962eb63b04bbd0a9deb4c1`), the header comment of `check-policy.mjs`
   naming that version and digest (the validator itself only needs the keywords the new schema already uses; checked
   at build time); `references/keys.md` rewritten for 0.9.1 with an `injection` section, `dependencies.lookup`, P13 and
   P14 enforced, the `.pharn/ci.yml` tighten-only rules and an "Every key path" list naming each dotted path of the
   schema; `references/enable.md` and `SKILL.md` updated to 0.4.x to 0.9.x and P01 to P14.
6. A drift test: `plugins/pharn-ci/tests/lib/schema-drift.mjs` (pure functions) and
   `plugins/pharn-ci/tests/schema-drift.test.mjs`, reading a pinned byte copy of v0.9.1's `schema/report.v2.json` at
   `plugins/pharn-ci/tests/fixtures/report.v2.json` (sha256
   `8f986f831fc659715d1fd7112aba7fe33734b63779e95cea6825074857a9d665`) and the bundled policy schema.
7. The D05 eval `explain-dependency-d05`, in the shape of `explain-agent-config-secret`: a scaffold repository whose
   PR adds a dependency to `package.json` and a `package-lock.json` entry whose `resolved` URL is on a private
   Artifactory host, a `bin/gh` fixture that serves the PR, its failing pharn-ci run and comment, and a manifest entry
   at pharn-ci `0.9.0` (the CHANGELOG says 0.9.1 changed nothing in the Action). Its report is generated by
   `regen.mjs --write` with a built pharn-ci v0.9.0 checkout (exported with `git archive` into the scratchpad, built
   with `pnpm install --frozen-lockfile && pnpm --filter @pharn-ci/cli... build`). Then the case is run once with
   `claude plugin eval`; `evals/results/` is git-ignored and not committed.

**Interface the AC tests are written to** (`plugins/pharn-ci/tests/lib/schema-drift.mjs`, ES module, Node core only):

- `reportCodes(schema)` → the sorted, de-duplicated codes named in `schema.$defs.message.properties.code.description`
  (whole tokens of the form `[A-Z][A-Z0-9]*(_[A-Z0-9]+)+`).
- `policyKeyPaths(schema)` → every dotted key path under `properties` (nested `properties` joined with `.`), in schema
  order.
- `missingCodes(markdown, codes)` → the codes that do not occur in `markdown` as a whole token (no letter, digit or `_`
  on either side), in the given order.
- `missingKeys(markdown, keyPaths)` → the key paths that do not occur in `markdown` inside backticks as the exact
  dotted path, in the given order.

## Applied lessons

- none — `check-lessons-index.mjs --verdict` printed `NO_CANON`: this project has no `pharn/memory-bank/` yet.

## Steps

- Write the drift module and its test first, run them to see the missing codes and keys, then edit the references
  until they pass.
- Edit `codes.md`, `policy.md`, `report.md` (copy to `pharn-ci-cover`), then `SKILL.md` of `pharn-ci-explain`.
- Copy the policy schema and the report schema from the v0.9.1 export; update `check-policy.mjs`'s header; run the
  checker against the new schema with a sample policy that uses `injection` and `dependencies.lookup`.
- Edit `keys.md`, `enable.md` and `SKILL.md` of `pharn-ci-policy`.
- Update the four existing tests the content forces: the description wording in `ac-0-4-5-descriptions.test.mjs`
  (accept a range that covers 0.3.x and 0.4.x), the bundled-schema digest in `check-policy.test.mjs`, and the
  top-level key lists in `pins.test.mjs` and `ac-0-4-5-policy-skill.test.mjs` (add `injection`).
- Build the D05 eval case, export and build pharn-ci v0.9.0 in the scratchpad, run `regen.mjs --write` for the
  manifest's versions, then `regen.mjs --check`.
- Run `npm run check`; run `claude plugin eval` on the new case once and record the result path.

## Files

- `plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md` — description range 0.1.x to 0.9.x, new comment sections, new Never rules
- `plugins/pharn-ci/skills/pharn-ci-explain/references/codes.md` — the 24 new codes, behaviour changes, input rename
- `plugins/pharn-ci/skills/pharn-ci-explain/references/policy.md` — rules P13 and P14, P01 to P14, 0.6.0 precedence
- `plugins/pharn-ci/skills/pharn-ci-explain/references/report.md` — new report objects, `fix`, new comment sections
- `plugins/pharn-ci/skills/pharn-ci-cover/references/report.md` — byte copy of the explain report reference (CI compares them)
- `plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md` — description range to 0.9.x and P01 to P14, body to 0.9.1
- `plugins/pharn-ci/skills/pharn-ci-policy/references/keys.md` — every v0.9.1 key path, injection, dependencies.lookup, tighten-only
- `plugins/pharn-ci/skills/pharn-ci-policy/references/enable.md` — version lines and what 0.5.0 to 0.9.1 apply
- `plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs` — header names v0.9.1 and the new digest
- `plugins/pharn-ci/skills/pharn-ci-policy/scripts/policy.v1.json` — byte copy of v0.9.1's schema/policy.v1.json
- `plugins/pharn-ci/tests/fixtures/report.v2.json` — byte copy of v0.9.1's schema/report.v2.json for the drift test
- `plugins/pharn-ci/tests/lib/schema-drift.mjs` — the drift comparison functions
- `plugins/pharn-ci/tests/schema-drift.test.mjs` — codes.md against the report schema, keys.md against the policy schema
- `plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs` — accept a version range that covers 0.3.x and 0.4.x
- `plugins/pharn-ci/tests/check-policy.test.mjs` — the bundled schema digest moves to v0.9.1
- `plugins/pharn-ci/tests/pins.test.mjs` — the policy schema's top-level keys gain `injection`
- `plugins/pharn-ci/tests/ac-0-4-5-policy-skill.test.mjs` — the policy schema's top-level keys gain `injection`
- `plugins/pharn-ci/evals/explain-dependency-d05/case.yaml` — the eval case
- `plugins/pharn-ci/evals/explain-dependency-d05/prompt.md` — the person's question
- `plugins/pharn-ci/evals/explain-dependency-d05/scaffold.sh` — the repository, the gh fixture and the generated report
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/answer.md` — what the answer must and must not say
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/loads-skill.md` — the explain skill is loaded
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/ran-gh.md` — the answer is grounded in the gh fixture
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-gh-writes.md` — no gh write call
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-label-command.md` — no accept label command
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-edit.md` — no Edit call
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-write.md` — no Write call
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/no-commit.md` — no commit
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-json.md` — generated whole-file grader
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-package-lock-json.md` — generated whole-file grader
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-pharn-ci-yml.md` — generated whole-file grader
- `plugins/pharn-ci/evals/explain-dependency-d05/graders/unchanged-github-workflows-pharn-ci-yml.md` — generated whole-file grader
- `plugins/pharn-ci/evals/fixtures/inputs/gh-fixture-d05.json` — the gh fixture template for the case
- `plugins/pharn-ci/evals/fixtures/manifest.json` — the case entry at pharn-ci 0.9.0

### Explicitly not touched

- `plugins/pharn-ci/.claude-plugin/plugin.json` — session 3 bumps it
- `CHANGELOG.md` — session 3 writes the entry
- `plugins/pharn-ci/skills/pharn-ci-install/SKILL.md` — out of scope
- `plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md` — out of scope
- `.github/workflows/ci.yml` — the manifest's existing 0.9.0 checkout is reused, so CI needs no change
- `plugins/pharn-ci/evals/explain-dependency-d05/results` — eval results, git-ignored, never committed

## Acceptance mapping

- AC-1 → step 4 and 5: both descriptions; the old description test accepts the range.
- AC-2 → step 1: one `###` heading per new code with its level, every code named in `codes.md`.
- AC-3 → step 1: the "Behaviour changes 0.5.0 to 0.9.1" section.
- AC-4 → step 3: the report reference and its byte copy.
- AC-5 → step 4: the "Read the verdict" bullets and the "Never" list.
- AC-6 → step 7: the eval case, generated with the real CLI.
- AC-7 → step 5: the key list and the bundled schema copy with its digest in the checker header.
- AC-8 → step 5: the checker with the new schema.
- AC-9 → step 5: the tighten-only paragraph of `keys.md`.
- AC-10 → step 6: the drift module returns the missing codes and keys, and the drift test fails on them.

## Risks & open questions

- The SPEC says "code enum"; the schema has a code list in a description instead. The plan reads that list and the
  summary reports the disagreement to the person.
- Building pharn-ci v0.9.0 runs `pnpm install` (network) in the scratchpad; the person accepted host execution for
  this run. If the build fails, the eval case cannot be generated and AC-6 stays red.
- The existing no-loosening test scans every sentence of both skills; the new "Never" bullets carry a negation word
  so they do not read as instructions to loosen.
- `claude plugin eval` needs the Claude CLI and model access; its result path is reported, not committed.
