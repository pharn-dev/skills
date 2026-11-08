---
spec_id: pharn-ci-explain-policy-current
state: Draft
spec_content_hash: ""
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

The `pharn-ci-explain` and `pharn-ci-policy` skills in `plugins/pharn-ci` describe pharn-ci up to 0.4.x. pharn-ci is
now at v0.9.1 (the newest tag of `~/Projects/pharn-ci`, equal to its `main`), and releases 0.5.0 to 0.9.0 added message
codes, report objects, policy keys, PR comment sections and several behaviour changes that make a check fail where it
passed. An agent asked "why did pharn-ci fail?" or "write our org policy" with these skills today cannot name the new
codes, misreads a D05 or PI01 block, and drafts policies against a schema that lacks the new keys. The person wants
both skills brought to the current release, described only from pharn-ci's own source at that tag, with a test that
stops the skills drifting from the schemas again. This is one of three sessions; the plugin version bump and the root
changelog are left to a later one.

## Scope

**In scope:**

- `pharn-ci-explain`: `references/codes.md` gains every message code of `schema/report.v2.json`'s code enum at v0.9.1
  that the v0.4.0 enum lacks, each with its default level, its meaning in plain words and what the reviewer should look
  at; it notes the `fail-on-threshold` to `fail-on-verdict` input rename (0.5.0) and every behaviour change the
  CHANGELOG names from 0.5.0 to 0.9.1.
- `pharn-ci-explain`: `references/report.md` describes the optional report objects added after 0.4.0 (`injection`,
  `setupHealth.stale`, `testIntegrity.exercise`, `dependencies`, `flaky`) and the `fix` object on messages and findings.
  The byte-identical copy in `pharn-ci-cover/references/report.md` changes with it, because CI compares the two.
- `pharn-ci-explain`: `SKILL.md`'s description names the version range up to 0.9.x, "Read the verdict" names the four
  new comment sections, and "Never" gains the rules on dependency, injection and quarantine escapes and on repeating an
  injection finding's content; `references/policy.md` covers P13 and P14.
- `pharn-ci-explain`: one new eval under `plugins/pharn-ci/evals/` for a D05 block where a lockfile resolves to a
  private registry host, with its fixture generated through `regen.mjs` like the other explain evals.
- `pharn-ci-policy`: its key reference and `scripts/check-policy.mjs` (with its bundled `scripts/policy.v1.json`) cover
  every policy key of v0.9.1's `schema/policy.v1.json`, and the reference states the `.pharn/ci.yml` tighten-only rules
  of 0.6.0; `SKILL.md`'s description names the version range up to 0.9.x and "P01 to P14".
- A drift test under `plugins/pharn-ci/tests/` that fails when a code of the report schema's enum is missing from
  `codes.md` or a key of the policy schema is missing from the policy skill's key reference.
- The edits to existing tests that this content forces (a version wording, a pinned schema digest, a top-level key list).

**Out of scope (non-goals):**

- `pharn-ci-install`, `pharn-ci-cover` (apart from the shared `report.md` copy) and `pharn-ci-fix`.
- A bump of `plugins/pharn-ci/.claude-plugin/plugin.json` or an entry in the root `CHANGELOG.md`.
- New pins of the pharn-ci Action in the install skill, the workflows or the existing eval cases.
- Any change to pharn-ci or to `~/Projects/pharn-ci`, which is read only.
- Committing the eval's results under `evals/results/`.
- Documenting a registry allow-list, a `warn` level or a policy switch for D05 that v0.9.1 does not have.

## Acceptance Criteria

- **AC-1** Given the two skills When their `SKILL.md` frontmatter is read Then `pharn-ci-explain`'s description names
  the range `0.1.x to 0.9.x`, and `pharn-ci-policy`'s description names a range that ends at `0.9.x` and the rules
  `P01 to P14`
  - verify: unit
- **AC-2** Given v0.9.1's report schema code enum When `pharn-ci-explain`'s `references/codes.md` and
  `references/policy.md` are read Then every code of that enum is named in `codes.md`, and every code the v0.4.0 enum
  lacks sits on a heading or table row of one of the two files that names its default level (`info`, `warn`, `error`
  or `block`)
  - verify: unit
- **AC-3** Given `references/codes.md` When it is read Then it names the input `fail-on-verdict` as the 0.5.0 name of
  `fail-on-threshold`, and it states each of these behaviour changes with the version that made it: 0.5.0 warnings that
  became errors, 0.6.0 `.pharn/ci.yml` tighten-only, 0.7.0 PI01 blocking and the `warn` verdict of
  `TESTS_NOT_EXERCISING_CHANGES`, 0.8.0 dependency safety on by default with D04 and D05 blocking
  - verify: unit
- **AC-4** Given `pharn-ci-explain`'s `references/report.md` When it is read Then it describes `injection`,
  `setupHealth.stale`, `testIntegrity.exercise`, `dependencies` and `flaky`, and the `fix` object with `kind`, `hint`,
  `target` and each of the kinds the v0.9.1 fix table uses, and it says that `fix` never changes a verdict and is
  carried in `report.json` only, not in the PR comment; and `pharn-ci-cover/references/report.md` is byte-identical
  to it
  - verify: unit
- **AC-5** Given `pharn-ci-explain`'s `SKILL.md` When it is read Then "Read the verdict" names the comment sections
  📄 Instructions, 🧬 Content, 📦 Dependencies and 🧫 Flaky, and "Never" says the skill never suggests
  `dependencies: never`, `injection.exempt` or a quarantine entry to get past a block, and never repeats the content of
  an injection finding
  - verify: unit
- **AC-6** Given the eval directory When the new D05 eval case is read Then it has a `case.yaml`, a `prompt.md`, a
  generated `scaffold.sh` whose report holds a `DEPENDENCY_D05` message at level `error` with a `fail` verdict for a
  lockfile entry that resolves to a private registry host, and an answer grader that requires the answer to name that a
  private registry the lockfile records is reported as D05 and fails if the answer tells the person to switch the check
  off or names a registry allow-list or a `warn` level for D05
  - verify: unit
- **AC-7** Given v0.9.1's policy schema When `pharn-ci-policy`'s key reference is read Then it names every key path of
  that schema, and `scripts/policy.v1.json` is a byte copy of it whose sha256 `scripts/check-policy.mjs` states
  - verify: unit
- **AC-8** Given `pharn-ci-policy`'s checker When it runs on a policy that sets `injection.exempt`,
  `injection.phrases`, `injection.signals` and `dependencies.lookup` Then it exits 0, and When it runs on one with
  `injection.signals.PI06` or a non-boolean `dependencies.lookup` Then it exits 1 naming the JSON Pointer of each
  - verify: unit
- **AC-9** Given `pharn-ci-policy`'s key reference When it is read Then it states that `.pharn/ci.yml` may only tighten
  the coverage threshold, `setup.require` and the test-integrity mode since 0.6.0, and that its `dependencies.lookup`
  never overrules a `dependencies: never` input and its minimums only rise
  - verify: unit
- **AC-10** Given the drift test When a code of the pinned report schema enum is absent from `codes.md`, or a key of the
  bundled policy schema is absent from the policy key reference Then the test fails naming that code or key
  - verify: unit

## Constraints

- Everything the skills state comes from `~/Projects/pharn-ci` at tag v0.9.1, read in this order: `CHANGELOG.md`
  (versions after 0.4.0), `README.md`, `docs/LIMITS.md`, `schema/report.v2.json`, `schema/policy.v1.json`, `action.yml`,
  `packages/core/src/fix/`. Where the CHANGELOG and the code disagree, the code wins and the disagreement is reported.
- The list of new codes comes from the report schema's code enum, not the CHANGELOG.
- CONTRIBUTING: every skill ships evals; describe only what the named version does; `npm run check` passes.
- No skill text tells a person to switch a check off, exempt a path or quarantine a test to get past a block.
- The new eval is run once with `claude plugin eval`; its results are not committed.
- `plugins/pharn-ci/.claude-plugin/plugin.json` and the root `CHANGELOG.md` do not change. Nothing is committed by hand.

## Assumptions

- "Current" is v0.9.1; its CHANGELOG says the Action is unchanged from 0.9.0 apart from its version, so the eval
  fixture is generated with the manifest's existing 0.9.0 pin and no new version line is added to the manifest or CI.
- The local `~/Projects/pharn-ci` checkout is on another branch with uncommitted edits, so the tag's files are read
  from a `git archive` of v0.9.1 rather than a worktree; `main` equals the tag, so nothing is ahead of it.
- `pharn-ci-policy` has no `references/policy.md`; its key reference is `references/keys.md` (with `enable.md`), which
  takes the content asked for `policy.md`. The drift test reads `keys.md`.
- The drift test reads the report code enum from a byte copy of v0.9.1's `schema/report.v2.json` committed under
  `plugins/pharn-ci/tests/`, pinned by its sha256, since the repository has no other copy of that schema.
- `flaky.quarantine`, `agents.max_files`, `agents.max_changed_lines` and `policy.rules.P13` / `P14` were already keys of
  the v0.4.0 schema; after 0.4.0 only `dependencies.lookup` and `injection` (`exempt`, `phrases`, `signals.PI01` to
  `PI05`) were added. The older keys are re-described where their behaviour changed.
- `settings.uploadJunit` is a setting of the pharn.dev app's policy response, not a key of `policy.v1.json`; it is
  described where the sources describe it and reported as not placeable as a policy key.
- D05 at v0.9.1 has no host allow-list and no `warn` default: its allowed hosts are a fixed list in code,
  `dependencies.registries` only chooses which ecosystems are looked up, D05 always blocks, and pharn-ci `main` has no
  open feature about D05. The eval's expected answer names only that.
- `ac-0-4-5-descriptions.test.mjs` accepts a description range that covers 0.3.x and 0.4.x (such as `0.1.x to 0.9.x`)
  in place of naming them one by one; the bundled-schema digest in `check-policy.test.mjs` and the top-level key lists
  in `pins.test.mjs` and `ac-0-4-5-policy-skill.test.mjs` move to v0.9.1. These are the only edits to existing tests.
- The repository's `npm test` already runs `plugins/pharn-ci/tests/*.test.mjs`, so the tests need no new runner.
