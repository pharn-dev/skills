---
spec_id: pharn-ci-plugin-0-4-2
spec_content_hash: "eda4e97ba161fad5fb505894fc142e4c16ac65618eef4affd3c5900cb10b036e"
---

## Files

- `plugins/pharn-ci/tests/ac-pins-0-4.test.mjs` — the tests for AC-1, AC-2, AC-4 and AC-14
- `plugins/pharn-ci/tests/ac-skill-descriptions-0-4.test.mjs` — the tests for AC-3
- `plugins/pharn-ci/tests/ac-explain-0-4.test.mjs` — the tests for AC-5, AC-6, AC-7 and AC-8
- `plugins/pharn-ci/tests/ac-policy-skill.test.mjs` — the tests for AC-9, AC-10 and AC-11
- `plugins/pharn-ci/tests/ac-install-policy.test.mjs` — the tests for AC-12
- `plugins/pharn-ci/tests/ac-evals-0-4.test.mjs` — the tests for AC-13
- `plugins/pharn-ci/tests/ac-npm-test-0-4.test.mjs` — the tests for AC-15
- `plugins/pharn-ci/tests/ac-docs-0-4.test.mjs` — the tests for AC-16

## Mapping

- AC-1 | unit | `plugins/pharn-ci/tests/ac-pins-0-4.test.mjs` | text of plugins/pharn-ci/skills/pharn-ci-install/SKILL.md, skills/pharn-ci-install/references/*.md, skills/*/scripts/*.mjs and evals/install-*/graders/*.md: every /pharn-dev\/pharn-ci@(\S+)/ match is a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756 followed by a # v0.4.0 comment (a regex-escaped `#\s*v0\.4\.0` in a grader pattern counts)
- AC-2 | unit | `plugins/pharn-ci/tests/ac-pins-0-4.test.mjs` | JSON.parse(plugins/pharn-ci/evals/fixtures/manifest.json): .pharnCi["0.4.0"].sha === "a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756", .pharnCi["0.4.0"].ref === "v0.4.0", .latest === "0.4.0"
- AC-3 | unit | `plugins/pharn-ci/tests/ac-skill-descriptions-0-4.test.mjs` | frontmatter `description:` of every plugins/pharn-ci/skills/*/SKILL.md (four skills incl. pharn-ci-policy) contains the tokens 0.3.x and 0.4.x
- AC-4 | unit | `plugins/pharn-ci/tests/ac-pins-0-4.test.mjs` | JSON.parse(plugins/pharn-ci/.claude-plugin/plugin.json).version === "0.2.0"
- AC-5 | unit | `plugins/pharn-ci/tests/ac-explain-0-4.test.mjs` | concatenated text of plugins/pharn-ci/skills/pharn-ci-explain/SKILL.md and references/*.md: each Scope code (TEST_INTEGRITY_TI02…TI16 set, TEST_INTEGRITY_INDEX_UNAVAILABLE, POLICY_UNAVAILABLE, POLICY_OVERRIDE_IGNORED, POLICY_P02…P09, POLICY_P11, POLICY_SETTINGS_INVALID, AGENT_PR_DETECTION_INCOMPLETE, AGENT_CONFIG_SECRET_S01…S11, AGENT_CONFIG_SECRET_UNSCANNED, UPLOAD_TOO_LARGE) appears in a heading or table row that also names a level word (block, error, warn or info)
- AC-6 | unit | `plugins/pharn-ci/tests/ac-explain-0-4.test.mjs` | pharn-ci-explain skill text: P01 stated with NO_AGENT_SETUP_FILES and AGENT_SETUP_EXPECTED_MISSING, P10 with POLICY_UNAVAILABLE, the "📜 Policy" comment section, the report's `policy` object with a violation's path and line, and `meta.isAgentPr`
- AC-7 | unit | `plugins/pharn-ci/tests/ac-explain-0-4.test.mjs` | pharn-ci-explain skill text: the accept label signs off test-integrity findings only, policy rules never read it, a `file:` policy may not set one, and the skill never applies it
- AC-8 | unit | `plugins/pharn-ci/tests/ac-explain-0-4.test.mjs` | pharn-ci-explain skill text: workflow inputs beat .pharn/ci.yml, an app policy beats both, a `file:` policy can only raise, and P02 to P06 are text guards, not a security boundary
- AC-9 | unit | `plugins/pharn-ci/tests/ac-policy-skill.test.mjs` | plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md frontmatter name === "pharn-ci-policy"; the skill's SKILL.md + references/*.md name version, coverage, setup, test_integrity, flaky, policy, agents, dependencies, P01…P11, auto, required, file:<path> and id-token: write
- AC-10 | unit | `plugins/pharn-ci/tests/ac-policy-skill.test.mjs` | CLI `node plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs <policy.json>` on a schema-valid policy.v1 document exits 0; the script's import specifiers are all `node:` modules (none of node:http, node:https, node:net, node:dgram, node:tls) and it has no fetch( call
- AC-11 | unit | `plugins/pharn-ci/tests/ac-policy-skill.test.mjs` | CLI `node plugins/pharn-ci/skills/pharn-ci-policy/scripts/check-policy.mjs <policy.json>` on a document with an unknown key, a wrong-typed value (e.g. coverage.threshold "80"), or no version exits non-zero and its stdout names each failing field's JSON Pointer (e.g. /foo, /coverage/threshold, /version)
- AC-12 | unit | `plugins/pharn-ci/tests/ac-install-policy.test.mjs` | plugins/pharn-ci/skills/pharn-ci-install/references/workflows.md: its second ```yaml block (the default new workflow, as pins.test.mjs reads it) has no `policy:` input and no `id-token: write`; the references name the `policy` input with `id-token: write` for an app policy, say `id-token: write` also lets `upload: auto` upload the redacted run when the org installed the Pharn GitHub App, and name `file:<path>`
- AC-13 | unit | `plugins/pharn-ci/tests/ac-evals-0-4.test.mjs` | directories plugins/pharn-ci/evals/{explain-policy-p02,explain-policy-pressure,explain-agent-config-secret,policy-org-draft} each with case.yaml, prompt.md, scaffold.sh and ≥1 graders/*.md; explain-agent-config-secret/graders/no-secret.md is a `type: regex`, `match: not_contains` grader whose pattern matches the planted value in the agent config its scaffold.sh writes (run the scaffold with bash in a temp dir) while the grader text does not contain that value verbatim
- AC-14 | unit | `plugins/pharn-ci/tests/ac-pins-0-4.test.mjs` | .github/workflows/ci.yml pharn-ci-fixtures job text: a checkout of pharn-dev/pharn-ci at `a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756 # v0.4.0`, a build step whose working-directory is that checkout, and `--pharn-ci 0.4.0=<that path>` on the regen.mjs --check line; and `git diff --name-only <merge-base with main> -- .github/workflows/` lists nothing but ci.yml, with every changed hunk inside the pharn-ci-fixtures job (skip the git half when no main ref exists)
- AC-15 | integration | `plugins/pharn-ci/tests/ac-npm-test-0-4.test.mjs` | the root package.json "test" script's suites, run as `node --test` over its globs MINUS this file (never `npm test` itself, which would re-run this test without end), exit 0; and the plugin tests reference manifest latest 0.4.0, the pharn-ci-policy skill and the Scope codes
- AC-16 | unit | `plugins/pharn-ci/tests/ac-docs-0-4.test.mjs` | CHANGELOG.md has a pharn-ci plugin entry naming pharn-ci 0.3.0, 0.4.0 and pharn-ci-policy; README.md names pharn-ci-policy
