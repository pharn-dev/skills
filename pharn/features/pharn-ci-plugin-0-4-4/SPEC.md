---
spec_id: pharn-ci-plugin-0-4-4
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

The pharn-ci plugin (`plugins/pharn-ci`) still teaches pharn-ci 0.2.0 (last change: PR #36). pharn-ci-install writes
a workflow pinned to the v0.2.0 release commit, every skill description claims support for "0.1.x ... or 0.2.x", and
pharn-ci-explain knows no message code added since then. pharn-ci 0.3.0 (nine new test-integrity signals and
`TEST_INTEGRITY_INDEX_UNAVAILABLE`, released 2026-10-26) and 0.4.0 (org policy rules P01 to P11, policy mode, agent PR
detection, the secret scan of agent config files, upload to pharn.dev, released 2026-10-27) are both tagged and
published. A team that installs the plugin today gets an old pin, an explain skill that cannot read the codes its pull
requests now show, and no help writing the org policy file 0.4.0 reads.

The outcome wanted: the plugin installs pharn-ci v0.4.0, explains every code 0.3.0 and 0.4.0 added (with the
"📜 Policy" comment section, the report's `policy` object and `meta.isAgentPr`), gains a pharn-ci-policy skill that
helps a team write a policy document for `schema/policy.v1.json` and checks it offline, and keeps the plugin's rule
that no skill loosens a gate. The work is modelled on PRs #35 and #36 of this repo. The source of truth for every fact
the skills teach is pharn-dev/pharn-ci read with `git show` at `origin/main` and at its v0.3.0 and v0.4.0 tags
(README.md, CHANGELOG.md, docs/LIMITS.md, docs/THREAT-MODEL.md, schema/report.v2.json, schema/policy.v1.json,
action.yml), never its working tree.

This is the fourth run of this intent. The earlier runs stopped on a workflow file the build may not write and on
missing per-test results for the `test` gate; the person has since made the `ci.yml` edit and set up per-test results.

## Scope

**In scope:**

- Pins: `pharn-dev/pharn-ci@a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756 # v0.4.0` wherever the plugin's skills, their
  references, their scripts and the install eval graders pin the pharn-ci version they install, with the eval
  fixtures manifest gaining a `0.4.0` entry that becomes `latest`. Each eval scaffold that keeps a 0.1.0 or 0.2.0 pin
  on purpose gets a decision, stated in the PR with its reason.
- The supported-version range in every pharn-ci skill description, and a minor bump of
  `plugins/pharn-ci/.claude-plugin/plugin.json`.
- pharn-ci-explain: for every code below, what it means, its default level, what can change the level, and the honest
  fix; the "📜 Policy" comment section; the report's `policy` object (violations with path and line);
  `meta.isAgentPr`.
  - New in 0.3.0: `TEST_INTEGRITY_TI02`, `TEST_INTEGRITY_TI05`, `TEST_INTEGRITY_TI06`, `TEST_INTEGRITY_TI07`,
    `TEST_INTEGRITY_TI08`, `TEST_INTEGRITY_TI09`, `TEST_INTEGRITY_TI12`, `TEST_INTEGRITY_TI15`,
    `TEST_INTEGRITY_TI16`, `TEST_INTEGRITY_INDEX_UNAVAILABLE`.
  - New in 0.4.0: `POLICY_UNAVAILABLE`, `POLICY_OVERRIDE_IGNORED`, `POLICY_P02` to `POLICY_P09`, `POLICY_P11`,
    `POLICY_SETTINGS_INVALID`, `AGENT_PR_DETECTION_INCOMPLETE`, `AGENT_CONFIG_SECRET_S01` to
    `AGENT_CONFIG_SECRET_S11`, `AGENT_CONFIG_SECRET_UNSCANNED`, `UPLOAD_TOO_LARGE`.
  - Rules with no code of their own: P01 raises `NO_AGENT_SETUP_FILES` and `AGENT_SETUP_EXPECTED_MISSING`; P10 is
    `POLICY_UNAVAILABLE`.
- A new skill, `plugins/pharn-ci/skills/pharn-ci-policy`: what each policy key does, which rule (P01 to P11) it feeds
  and that rule's default level; turning policy on (the `policy` input `auto`, `required` or `file:<path>`, and
  `never`; its default; what `auto` does without an app or an OIDC token; `id-token: write` for `auto`); policy mode
  (which files are read, when, and that nothing read leaves the job); which keys a `file:` policy may not set; an
  offline check of a draft against `schema/policy.v1.json`, with no network and no new runtime dependency.
- pharn-ci-install: keeps its default workflow; offers the `policy` input and `id-token: write` only when the person
  wants an app policy, says what else `id-token: write` turns on, and mentions `file:<path>` for a team with no
  account.
- pharn-ci-cover: its supported-version range, and the report fields 0.3.0 and 0.4.0 add to the report reference it
  shares with pharn-ci-explain.
- Four new evals in the style of `plugins/pharn-ci/evals/`: explain a `POLICY_P02` finding; explain an
  `AGENT_CONFIG_SECRET` finding without repeating the secret; refuse, under pressure, to weaken a policy or remove a
  protected path; write a valid policy with pharn-ci-policy.
- The plugin's `tests/` and the fixture tests updated wherever they pin versions, the skill list or the code list.
- This repo's `CHANGELOG.md` and `README.md`: an entry for the pharn-ci plugin. The root `LIMITS.md`,
  `CONTRIBUTING.md` and `THREAT-MODEL.md` lines that name the pharn-ci versions the plugin supports or pins, as PRs
  #35 and #36 updated them.

**Out of scope (non-goals):**

- Every file under `.github/workflows/`. The one `ci.yml` edit this work needs (the pharn-ci-fixtures job's checkout
  of pharn-ci at `a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756 # v0.4.0` into `.cache/pharn-ci-0.4.0`, its build step, and
  `--pharn-ci 0.4.0=.cache/pharn-ci-0.4.0` on the `regen.mjs --check` line) was made by the person before this run and
  sits uncommitted in the working tree; this run reads it and never writes it.
- The person's per-test results work, also uncommitted and done before this run: `.github/scripts/pharn-test-reporter.mjs`
  and its test, the `package.json` `test` script, the CONTRIBUTING.md reporter note, `"testResults"` in
  `pharn.config.json`, and `pharn/.run/` in `.gitignore`. This run reads them and never writes them.
- The pharn and phargus plugins, and `src/phargus`.
- Regenerating `plugins/pharn-ci/evals/results`, and running e2e tests or the e2e evals.
- Applying, removing or asking to apply the accept label, and any skill text that suggests loosening a gate to get a
  PR through.
- Changes to pharn-ci itself.

## Scenarios

- A reviewer sees a pharn-ci comment with a "📜 Policy" section listing a `POLICY_P02` violation in
  `.claude/settings.json`, asks the agent what it means, and gets the rule, the file and line, its level, and the
  honest fix (change the settings file), with the note that P02 is a text guard, not a security boundary, and no
  suggestion to edit the policy or lower the rule.
- A developer whose PR fails on an `AGENT_CONFIG_SECRET_S0x` finding asks why; the agent names the shape, the path and
  line, and says to remove the value and rotate the secret, without printing the value.
- A team lead asks for an org policy that requires a deny rule and protects `.github/workflows/**` for agent PRs;
  pharn-ci-policy drafts the file, checks it offline against the schema, and says how to turn it on with
  `policy: file:<path>` or an app policy with `id-token: write`.
- An agent PR is blocked by `POLICY_P11`; the author asks the agent to remove the protected path from the policy; the
  agent declines and explains that settings a PR carries never loosen the gate.

## Acceptance Criteria

- **AC-1** Given the plugin after the change When every `pharn-dev/pharn-ci@` pin in pharn-ci-install's SKILL.md, its
  references, the skills' scripts and the install eval graders is read Then each one names
  `a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756` with the comment `# v0.4.0`
  - verify: unit
- **AC-2** Given `plugins/pharn-ci/evals/fixtures/manifest.json` and `.github/workflows/ci.yml` as it now stands When
  they are read Then the manifest has a `0.4.0` entry with sha `a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756` and ref
  `v0.4.0`, `latest` is `0.4.0`, and ci.yml checks out every manifest version at its sha and passes it to
  `regen.mjs --check`
  - verify: unit
- **AC-3** Given each `SKILL.md` under `plugins/pharn-ci/skills` When its frontmatter `description` is read Then it
  names pharn-ci 0.3.x and 0.4.x among the supported versions
  - verify: unit
- **AC-4** Given `plugins/pharn-ci/.claude-plugin/plugin.json` When its `version` is read Then it is `0.2.0`
  - verify: unit
- **AC-5** Given pharn-ci-explain's skill files When they are searched for each code in Scope's 0.3.0 and 0.4.0 lists
  Then every code appears, each with its default level stated
  - verify: unit
- **AC-6** Given pharn-ci-explain's skill files When they are read Then they state that P01 raises
  `NO_AGENT_SETUP_FILES` and `AGENT_SETUP_EXPECTED_MISSING`, that P10 is `POLICY_UNAVAILABLE`, and they describe the
  "📜 Policy" comment section, the report's `policy` object with violation path and line, and `meta.isAgentPr`
  - verify: unit
- **AC-7** Given pharn-ci-explain's skill files When they are read Then they say that P02 to P06 are text guards and
  not a security boundary, that the accept label signs off test-integrity findings only and no policy rule reads it,
  that a `file:` policy may not set an accept label, and that workflow inputs beat `.pharn/ci.yml`, an app policy beats
  both, and a `file:` policy can only raise
  - verify: unit
- **AC-8** Given every pharn-ci skill's SKILL.md and references When they are read Then no sentence tells the agent to
  edit the policy file, lower a rule, remove a protected path, weaken `.pharn/ci.yml` or apply the accept label to get
  a PR through, and the "Never" lists of pharn-ci-explain and pharn-ci-policy name editing the policy, lowering a rule
  and removing a protected path
  - verify: unit
- **AC-9** Given `plugins/pharn-ci/skills/pharn-ci-policy` When its SKILL.md and references are read Then the skill is
  named `pharn-ci-policy`, they name every top-level key of `schema/policy.v1.json` at v0.4.0, each rule P01 to P11
  with its default level, the `policy` input values `auto`, `required` and `file:<path>` with `auto` as the default,
  what `auto` does with no app or no OIDC token, `id-token: write`, the files policy mode reads, and that nothing it
  reads leaves the job
  - verify: unit
- **AC-10** Given a policy document that is valid against `schema/policy.v1.json` at v0.4.0 When the pharn-ci-policy
  checker is run on it with Node core only and no network Then it exits 0
  - verify: unit
- **AC-11** Given a policy document with an unknown key, a value of the wrong type, or no `version` When the
  pharn-ci-policy checker is run on it Then it exits non-zero and its output names the path of each failing field
  - verify: unit
- **AC-12** Given pharn-ci-install's references When the default workflow template is read Then it carries no
  `policy` input and no `id-token: write`, and the references name the `policy` input with `id-token: write` for an
  app policy, say that `id-token: write` also lets `upload: auto` upload the redacted run when the org installed the
  Pharn GitHub App, and name `file:<path>` for a team with no account
  - verify: unit
- **AC-13** Given `plugins/pharn-ci/evals` When it is listed Then it holds four new cases, one for each eval in Scope,
  each with a `case.yaml`, a `prompt.md`, a `scaffold.sh` and at least one grader, and the `AGENT_CONFIG_SECRET` case
  has a grader that fails when the answer contains the secret value its scaffold plants
  - verify: unit
- **AC-14** Given the repo after the change When the suites of the root `package.json` `test` script run Then they
  exit 0, and the plugin tests that pin versions, the skill list or the code list cover v0.4.0, pharn-ci-policy and
  the codes in Scope
  - verify: integration
- **AC-15** Given this repo's `CHANGELOG.md` and `README.md` When they are read Then the changelog has a pharn-ci
  plugin entry naming pharn-ci 0.3.0 and 0.4.0 support and the pharn-ci-policy skill, and the README lists
  pharn-ci-policy
  - verify: unit

## Constraints

- Every fact the skills teach is checked against pharn-dev/pharn-ci at its v0.3.0 and v0.4.0 tags and `origin/main`
  (read with `git show` after `git fetch`, never a working tree); the increment description only points.
- Settings a PR carries never loosen a gate: no skill suggests editing the policy file, lowering a rule, removing a
  protected path or weakening `.pharn/ci.yml` to get a PR through, and pharn-ci-policy never weakens an existing
  policy unless the person asks for that specific change.
- No skill applies, removes or asks to apply the accept label.
- No skill output repeats a secret value from an agent config file.
- The policy checker uses no network and adds no runtime dependency (Node core only, like pharn-ci-cover's script).
- The plan's declared files name no file under `.github/workflows/`, no `pharn.config.json`, no `.gitignore`, neither
  `.github/scripts/pharn-test-reporter.mjs` nor its test, and not the `package.json` `test` script; tests and the regen
  check may read them as they now stand. The person's CONTRIBUTING.md reporter note stays as written.
- Acceptance test files use names no earlier run's `AC-TESTS.md` (`pharn-ci-plugin-0-4`, `-0-4-2`, `-0-4-3`) claimed.
- Files are written only with Edit/Write, never through Bash.
- No e2e test is run.
- The PR opens as a draft if `gh release view v0.4.0 -R pharn-dev/pharn-ci` does not show a published `v0.4.0` release
  when it opens. At spec time it shows tag `v0.4.0`, not a draft, published 2026-10-27.

## Assumptions

- The plugin version becomes `0.2.0`, the next minor of the released `0.1.0` (tag `pharn-ci-v0.1.0`).
- The offline check is a Node-core script under `skills/pharn-ci-policy/scripts/` (the description allows this or a
  field-by-field check; a script is what AC-10 and AC-11 can test).
- Schema keys that no 0.4.0 rule reads (for example `flaky`, `dependencies`) are described as accepted by the schema
  but not enforced, as pharn-ci's own docs say; the build confirms each from the tag.
- The `policy` input also takes `never` (action.yml at v0.4.0); the skill names it alongside the three values the
  description lists.
- The install eval cases move to pharn-ci 0.4.0 in the manifest and their fixtures are regenerated with `regen.mjs`
  from a v0.4.0 checkout; the explain and cover cases whose 0.1.0 or 0.2.0 output is the point of the case keep their
  pin, and the PR says why for each.
- The new `POLICY_P02` and `AGENT_CONFIG_SECRET` eval fixtures are generated with the real pharn-ci 0.4.0 CLI
  (`--policy-file` gives a policy offline), through `regen.mjs`, so CI's `--check` covers them.
- The planted secret in the `AGENT_CONFIG_SECRET` eval is an obviously fake value of the scanned shape; if a secret
  scanner (this repo has `.gitleaks.toml`) would flag it in the committed scaffold, the scaffold assembles it at run
  time and the grader knows the value.
- v0.4.0 declares the same `packageManager` (`pnpm@10.32.1`) as v0.2.0 (checked at spec time), so the fixtures job's
  one-pnpm check holds with the person's `ci.yml` edit as it stands.
- Updating the root `LIMITS.md`, `CONTRIBUTING.md` and `THREAT-MODEL.md` version lines follows "model the work on PRs
  #35 and #36", which edited them; the description names only CHANGELOG.md and README.md. The marketplace
  description names no version and stays as it is unless it must name pharn-ci-policy's purpose.
- The `test` gate is the root `package.json` `test` script (Node's built-in runner over `.github/scripts`,
  `plugins/pharn-ci/tests` and `plugins/pharn-ci/evals/fixtures`), which now loads the person's per-test reporter, and
  `pharn.config.json` maps it to `pharn-json` results, so `/pharn-test` can run unit and integration criteria
  test-first; the test stage's own preflight decides it.

## Success Metrics

- The four new evals pass in a later recorded eval run (not run in this increment).
