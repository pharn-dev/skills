---
spec_id: pharn-ci-plugin-0-4
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

The pharn-ci plugin (`plugins/pharn-ci`) still teaches pharn-ci 0.2.0: its skills install `pharn-dev/pharn-ci` at
the v0.2.0 release commit, their descriptions claim support for "0.1.x ... or 0.2.x", and pharn-ci-explain knows no
message code added since (last change: PR #36). pharn-ci 0.3.0 (nine new test-integrity signals) and 0.4.0 (org
policy rules P01 to P11, policy mode, agent PR detection, check A7 for secrets in agent configs, upload to pharn.dev)
are both tagged, so a team that installs the plugin today gets an old pin and an explain skill that cannot read the
codes its PRs now show. The team also has no help writing the org policy file that 0.4.0 reads.

The outcome wanted: the plugin installs pharn-ci v0.4.0, explains every code 0.3.0 and 0.4.0 added (including the
"📜 Policy" comment section, the report's `policy` object and `meta.isAgentPr`), gains a pharn-ci-policy skill that
helps a team write and check a `schema/policy.v1.json` document offline, and keeps its rules that no skill ever
loosens a gate. The work is modelled on PRs #35 and #36 of this repo; the pharn-ci repo's `origin/main` and its
v0.3.0 and v0.4.0 tags (README.md, CHANGELOG.md, docs/LIMITS.md, docs/THREAT-MODEL.md, schema/report.v2.json,
schema/policy.v1.json, action.yml) are the source of truth for every fact the skills teach.

## Scope

**In scope:**

- Pins: `pharn-dev/pharn-ci@<v0.4.0 release commit> # v0.4.0` wherever the plugin's skills, their references and
  their install eval graders pin the version they install; a decision, stated in the PR, for each eval scaffold
  that pins an old version on purpose.
- The supported-version range in every pharn-ci skill description, and a minor bump of
  `plugins/pharn-ci/.claude-plugin/plugin.json`.
- pharn-ci-explain: every code below, with what it means, its default level, what can change the level, and the
  honest fix; the "📜 Policy" comment section; the report's `policy` object (violations with path and line);
  `meta.isAgentPr`.
  - New in 0.3.0: `TEST_INTEGRITY_TI02`, `TEST_INTEGRITY_TI05`, `TEST_INTEGRITY_TI06`, `TEST_INTEGRITY_TI07`,
    `TEST_INTEGRITY_TI08`, `TEST_INTEGRITY_TI09`, `TEST_INTEGRITY_TI12`, `TEST_INTEGRITY_TI15`,
    `TEST_INTEGRITY_TI16`, `TEST_INTEGRITY_INDEX_UNAVAILABLE`.
  - New in 0.4.0: `POLICY_UNAVAILABLE`, `POLICY_OVERRIDE_IGNORED`, `POLICY_P02` to `POLICY_P09`, `POLICY_P11`,
    `POLICY_SETTINGS_INVALID`, `AGENT_PR_DETECTION_INCOMPLETE`, `AGENT_CONFIG_SECRET_S01` to
    `AGENT_CONFIG_SECRET_S11`, `AGENT_CONFIG_SECRET_UNSCANNED`, `UPLOAD_TOO_LARGE`.
  - Rules with no code of their own: P01 raises `NO_AGENT_SETUP_FILES` and `AGENT_SETUP_EXPECTED_MISSING`; P10 is
    `POLICY_UNAVAILABLE`.
- A new skill, `plugins/pharn-ci/skills/pharn-ci-policy`: each policy key, the rule (P01 to P11) it feeds and that
  rule's default level; turning policy on (the `policy` input `auto`, `required` or `file:<path>`, its default and
  what `auto` does without an app or an OIDC token, and `id-token: write` for `auto`); policy mode (which files are
  read, when, and that nothing read leaves the job); an offline check of a draft against `schema/policy.v1.json`.
- pharn-ci-install: keeps its default workflow; offers the `policy` input and `id-token: write` only when the person
  wants an app policy, and mentions `file:<path>` for a team with no account.
- Four new evals in the style of `plugins/pharn-ci/evals/`: explain a `POLICY_P02` finding; explain an
  `AGENT_CONFIG_SECRET` finding without repeating the secret; refuse, under pressure, to weaken a policy or remove a
  protected path; write a valid policy with pharn-ci-policy.
- The plugin's `tests/` updated wherever they pin versions, the skill list or the code list.
- This repo's `CHANGELOG.md` and `README.md`: an entry for the pharn-ci plugin.

**Out of scope (non-goals):**

- The pharn and phargus plugins, and `src/phargus`.
- `.github/workflows` (see Open Questions for the one place this collides with the pin work).
- Regenerating `evals/results`, and running the e2e evals.
- Applying, removing or asking to apply the accept label, and any skill text that suggests loosening a gate to get
  a PR through.
- Changes to pharn-ci itself.

## Scenarios

- A reviewer sees a pharn-ci comment with a "📜 Policy" section listing a `POLICY_P02` violation in
  `.claude/settings.json`, asks the agent what it means, and gets the rule, the file and line, its level, and the
  honest fix (change the settings file), with the note that P02 is a text guard, not a security boundary, and no
  suggestion to edit the policy or lower the rule.
- A developer whose PR fails on `AGENT_CONFIG_SECRET_S02` asks why; the agent explains the shape, the path and line,
  and how to remove and rotate the secret, without printing the secret.
- A team lead asks for an org policy that requires a deny rule and protects `.github/workflows/**` for agent PRs;
  pharn-ci-policy drafts the file, checks it offline against the schema, and says how to turn it on with
  `policy: file:<path>` or an app policy.
- An agent PR is blocked by `POLICY_P11`; the author asks the agent to remove the protected path from the policy;
  the agent declines and explains why a PR's own edit cannot loosen the policy.

## Acceptance Criteria

- **AC-1** Given the plugin after the change When every `pharn-dev/pharn-ci@` pin in pharn-ci-install's SKILL.md,
  its references and the install eval graders is read Then each one names the commit tagged `v0.4.0` in
  pharn-dev/pharn-ci (`a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756`) with the comment `# v0.4.0`
  - verify: unit
- **AC-2** Given each `SKILL.md` under `plugins/pharn-ci/skills` When its frontmatter `description` is read Then it
  names pharn-ci 0.3.x and 0.4.x among the supported versions
  - verify: unit
- **AC-3** Given `plugins/pharn-ci/.claude-plugin/plugin.json` When its `version` is read Then it is `0.2.0`
  - verify: unit
- **AC-4** Given pharn-ci-explain's skill files When they are searched for each code in Scope's 0.3.0 and 0.4.0
  lists Then every code appears, each with its default level stated
  - verify: unit
- **AC-5** Given pharn-ci-explain's skill files When they are read Then they state that P01 raises
  `NO_AGENT_SETUP_FILES` and `AGENT_SETUP_EXPECTED_MISSING`, that P10 is `POLICY_UNAVAILABLE`, and they describe the
  "📜 Policy" comment section, the report's `policy` object with a violation's path and line, and `meta.isAgentPr`
  - verify: unit
- **AC-6** Given pharn-ci-explain's skill files When they are read Then they state that the accept label signs off
  test-integrity findings only, that policy rules never read it, that a `file:` policy may not set one, and that the
  skill never applies it
  - verify: unit
- **AC-7** Given pharn-ci-explain's skill files When they are read Then they state the precedence (workflow inputs
  beat `.pharn/ci.yml`, an app policy beats both, a `file:` policy can only raise) and that P02 to P06 are text
  guards, not a security boundary
  - verify: unit
- **AC-8** Given the plugin When `plugins/pharn-ci/skills/pharn-ci-policy/SKILL.md` is read Then its frontmatter
  `name` is `pharn-ci-policy`, and the skill's files name every top-level key of `schema/policy.v1.json` at v0.4.0,
  every rule P01 to P11, the `policy` input values `auto`, `required` and `file:<path>`, and `id-token: write`
  - verify: unit
- **AC-9** Given a policy document that is valid against `schema/policy.v1.json` at v0.4.0 When the pharn-ci-policy
  checker is run on it with Node core only and no network Then it exits 0
  - verify: unit
- **AC-10** Given a policy document with an unknown key, a value of the wrong type, or no `version` When the
  pharn-ci-policy checker is run on it Then it exits non-zero and its output names the path of each failing field
  - verify: unit
- **AC-11** Given pharn-ci-install's references When the default workflow template is read Then it carries no
  `policy` input and no `id-token: write`, and the references name the `policy` input with `id-token: write` for an
  app policy and `file:<path>` for a team with no account
  - verify: unit
- **AC-12** Given `plugins/pharn-ci/evals` When it is listed Then it holds four new cases, one for each eval in
  Scope, each with a `case.yaml`, a `prompt.md`, a `scaffold.sh` and at least one grader, and the
  `AGENT_CONFIG_SECRET` case has a grader that fails when the answer contains the secret value its scaffold plants
  - verify: unit
- **AC-13** Given the repo after the change When `npm test` runs Then it exits 0, and the plugin tests that pin
  versions, the skill list or the code list cover v0.4.0, pharn-ci-policy and the codes in Scope
  - verify: integration
- **AC-14** Given this repo's `CHANGELOG.md` and `README.md` When they are read Then the changelog has a pharn-ci
  plugin entry naming pharn-ci 0.3.0/0.4.0 support and the pharn-ci-policy skill, and the README lists
  pharn-ci-policy
  - verify: unit

## Constraints

- Every fact the skills teach is checked against pharn-dev/pharn-ci at its v0.3.0 and v0.4.0 tags (read with
  `git show`, never a working tree); the increment description only points.
- No skill suggests editing the policy file, lowering a rule, removing a protected path or weakening `.pharn/ci.yml`
  to get a PR through, and pharn-ci-policy never weakens an existing policy unless the person asks for that specific
  change.
- No skill applies, removes or asks to apply the accept label.
- No skill output repeats a secret value from an agent config file.
- The policy checker uses no network and adds no runtime dependency (Node core only, like pharn-ci-cover's script).
- Files are written only with Edit/Write, never through Bash.
- pharn-dev/pharn-ci v0.4.0 is tagged (`gh release view v0.4.0 -R pharn-dev/pharn-ci` shows tag `v0.4.0`, not a
  draft), so the PR does not need to open as a draft.

## Assumptions

- The plugin version becomes `0.2.0` (the next minor of `0.1.0`).
- The offline check is a Node-core script under `skills/pharn-ci-policy/scripts/` (the description allows this or a
  field-by-field check; the script is what AC-9 and AC-10 can test).
- Schema keys that no 0.4.0 rule reads (for example `flaky`, `dependencies`, `agents.max_files`) are described as
  accepted by the schema but not enforced by 0.4.0, as pharn-ci's own docs say; the build confirms each from the tag.
- pharn-ci-cover changes only in its supported-version range and any report fields 0.3.0/0.4.0 add that its
  `references/report.md` (kept identical to pharn-ci-explain's copy) must describe.
- Eval scaffolds whose 0.1.0 or 0.2.0 pharn-ci output is the point of the case keep that pin; the PR says why for
  each.
- The repo's own CI pin (`pharn-dev/pharn-ci@a88e62a… # v0.1.0` in `.github/workflows/ci.yml`) stays, as
  `.github/workflows` is out of scope.

## Open Questions

- [NEEDS CLARIFICATION: Moving pharn-ci-install to v0.4.0 collides with the `.github/workflows` non-goal. `plugins/pharn-ci/tests/pins.test.mjs` and `evals/fixtures/regen.mjs` require the install pin to equal `manifest.json`'s `latest` entry, and require `.github/workflows/ci.yml`'s pharn-ci-fixtures job to check out and pass every manifest version to `regen.mjs --check`. PR #36, the model, edited ci.yml for this. The new POLICY_P02 and AGENT_CONFIG_SECRET evals would also need 0.4.0 output regenerated there. Which do you want: (a) allow this one edit to ci.yml's pharn-ci-fixtures job, adding a v0.4.0 checkout, build and `--pharn-ci 0.4.0` argument, leaving the rest of ci.yml as it is; or (b) leave ci.yml untouched, decouple the install pin from the regen manifest in pins.test.mjs and regen.mjs, and ship the new 0.4.0 eval fixtures without CI regeneration?]
