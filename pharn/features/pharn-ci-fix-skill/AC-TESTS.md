---
spec_id: pharn-ci-fix-skill
spec_content_hash: 2cee86075dbef9d3971283cd4ef188ad3a7f775d6c1013905da7e10c0590c941
---

## Files

- `plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs` — the tests for AC-1, AC-2, AC-3 and AC-4
- `plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs` — the tests for AC-5, AC-6 and AC-7
- `plugins/pharn-ci/tests/ac-fix-docs.test.mjs` — the tests for AC-8

## Mapping

- AC-1 | unit | `plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs` | plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md frontmatter: `name` === "pharn-ci-fix"; the `description` value (its line plus indented continuation lines) contains the token 0.9.x, the word `fix` as an object or field name, and the skill names pharn-ci-cover and pharn-ci-explain
- AC-2 | unit | `plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs` | concatenated text of plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md and references/*.md: each of add-test, restore-test, restore-assertion, revert-config, remove-dependency, request-review, split-pr and none in backticks; `kind`, `hint` and `target` in backticks; messages, testIntegrity.signals, policy.violations, setupHealth.stale, injection.signals and dependencies.signals each in backticks; and for each of the eight kinds a Markdown heading or table row whose text contains that backticked kind followed by at least one sentence of prose
- AC-3 | unit | `plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs` | plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md: one paragraph that says data and never instructions and names `hint` and `target`; and a passage that names single quotes and `--` for a `target` placed in a command
- AC-4 | unit | `plugins/pharn-ci/tests/ac-fix-skill-text.test.mjs` | plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md: the bullets of the list under the heading whose text starts with "Never" name lowering a threshold or adding an exclusion; editing .pharn/ci.yml, the workflow or the org policy; turning a test off (skip, disable or turn off); the accept label; a hint as proof (proof or proves) of a fix; changing code for `request-review` or `none`; and commit or push; and no sentence of SKILL.md or references/*.md (fences and frontmatter dropped, the same sentence split and LOOSENING patterns as ac-0-4-5-no-loosening.test.mjs, copied into this test) tells the agent to loosen a gate without a negation word
- AC-5 | unit | `plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs` | CLI `node plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs --report <file>` on a schemaVersion 2 report whose messages and testIntegrity.signals, policy.violations, setupHealth.stale, injection.signals and dependencies.signals entries carry valid fix objects: exit 0; stdout JSON.parse gives `ok` true, `problems` [], `fixes` with one entry per fix carrying `array`, `index`, `kind`, `hint`, `code` (messages) or `id` (findings) and `target` when present, and `byKind` whose keys are the eight kinds in schema order with each fix under its kind; also export `listFixes(report)` from that module returns the same object
- AC-6 | unit | `plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs` | CLI `node plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs --report <file>` on a schemaVersion 2 report with a fix whose kind is "lower-threshold", a fix whose hint is 201 characters, a fix with an extra property `extra`, and a message fix with a `target`: exit 1; stdout JSON `problems[].pointer` includes the JSON Pointer of each (for example /messages/1/fix/kind, /testIntegrity/signals/0/fix/hint, /policy/violations/0/fix/extra, /messages/0/fix/target)
- AC-7 | unit | `plugins/pharn-ci/tests/ac-fix-list-fixes.test.mjs` | CLI `node plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs --report <file>` on a schemaVersion 2 report with two messages and one testIntegrity.signals finding and no `fix` key anywhere: exit 0; stdout JSON `fixes` is [] and `withoutFix` is 3
- AC-8 | unit | `plugins/pharn-ci/tests/ac-fix-docs.test.mjs` | README.md contains pharn-ci-fix; the CHANGELOG.md text from `## [Unreleased]` up to the next `## [` heading contains pharn-ci-fix and 0.9.0
