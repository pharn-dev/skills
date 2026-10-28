# Contributing

## Bugs, proposals, and security

Use the [issue forms](https://github.com/pharn-dev/skills/issues/new/choose) for
ordinary bugs and feature or skill proposals. Include the affected skill,
installation revision, agent and tool versions, and a minimal reproduction.
Sanitize logs and use synthetic data instead of production captures.

Report vulnerabilities privately through the channels in [SECURITY.md](SECURITY.md).
Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Before making compatibility or
security claims, read [LIMITS.md](LIMITS.md) and [THREAT-MODEL.md](THREAT-MODEL.md).

## Rules

- **One plugin per product.** `plugins/pharn` holds skills for PHARN,
  `plugins/pharn-ci` holds skills for pharn-ci and `plugins/phargus` holds skills
  for Phargus; another tool gets its own plugin and
  its own marketplace entry. The marketplaces in `.claude-plugin/` and
  `.agents/plugins/` are maintained by hand.
- **Generated plugins keep their sources in `src/<plugin>/`.** For `phargus`,
  only the `SKILL.md` files under `plugins/phargus/` are written by hand; edit the
  rest in `src/phargus/` and run `npm run build` there.
- **Every skill ships evals** under `plugins/<plugin>/evals/`, covering the
  behaviour the skill must get right and the actions it must not take.
  Exception: `phargus` runs the same cases in Codex and Claude Code, which
  `claude plugin eval` cannot do, so its evals live in `src/phargus/evals/`.
- **Placement.** Skills that operate a tool from outside live here. Skills that
  are part of the PHARN methodology and need its floor ship with pharn-oss.
- Describe only what the tool version named in the skill actually does.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## CI gates

Pull requests must pass the checks below. The first four run in
`.github/workflows/ci.yml`; Socket reports through its installed integration:

- **Validate**: `claude plugin validate --strict` on the marketplace and on
  each plugin, the pharn-ci helpers' and pins' unit tests
  (`node --test plugins/pharn-ci/tests/*.test.mjs`), and the identical copies of
  shared eval scaffolds and of the pharn-ci report reference.
- **Markdown lint**: `markdownlint-cli2` over all Markdown files.
- **Phargus** (Node 22.18.0 and 24): formatting, generated files, skill
  metadata, lint, typecheck, unit tests, integration tests against the pinned
  Phargus commit, and the package check, all from `src/phargus`.
- **Socket Security: Project Report**: the installed Socket integration's
  dependency report.

Evals need model credentials, so CI does not run them. For changes to skill
instructions, runtime helpers, references, or other behavior-affecting content,
run the applicable evals locally before merging (see [Evals](#evals)) and put
the scores and review results in the PR. Documentation and repository-configuration
changes that leave behavior unchanged do not require new model trials.
For `phargus`, the eval runner records every trial in
`src/phargus/VERIFICATION.json` and writes redacted evidence to
`src/phargus/verification/<run>/`; commit both. A maintainer then signs each
trial off with `npm run review:evals` under their GitHub handle. Never edit
`VERIFICATION.json` by hand. `npm run check:evals` fails until every case in both
clients has an accepted trial for the shipped content (see
[src/phargus/VERIFICATION.md](src/phargus/VERIFICATION.md)).

`npm test` also loads `.github/scripts/pharn-test-reporter.mjs` next to the
`spec` reporter. It writes PHARN's `pharn-json` per-test results to
`$PHARN_TEST_RESULTS` only when PHARN sets that variable, and writes nothing
otherwise. PHARN reads the file only after a person adds
`"testResults": { "test": "pharn-json" }` to `pharn.config.json`, which the
PHARN CLI installs, so that line is a person's edit, not a build's.

Pinned versions and action SHAs are bumped deliberately, never with a floating
tag.

## Evals

```bash
claude plugin eval plugins/pharn --scaffold --allow-tools Bash --trust-plugin --no-publish
```

Each `pharn` eval case builds a throwaway project with a stub `pharn`
executable (`scaffold.sh`, which is why `--scaffold` is needed). The stub prints
canned 0.10.0-shaped output, logs its calls and needs no network, so the real
CLI is never invoked. `--allow-tools Bash` is needed because the cases drive the
stub through Bash. A stub cannot test how the skill finds a real CLI on `PATH`;
the prompts name the stub's path instead. The exception is `cli-missing-asks`,
which builds no CLI at all to check that the skill asks before an `npx`
download; run it on a machine without `pharn` on `PATH` or a cached
`@pharn-dev/pharn` that `npx --no-install` could find. Cases sharing one stub
carry identical copies of its `scaffold.sh`, and CI checks that they match.

```bash
claude plugin eval plugins/pharn-ci --scaffold --allow-tools Bash Edit Write --trust-plugin --no-publish
```

Each `pharn-ci` eval case builds a small git repository with a pull request
branch. Reports, PR comments and CLI output in the scaffolds were generated
with the real pharn-ci CLI and renderer for that exact tree, so line numbers
and message texts match. `plugins/pharn-ci/evals/fixtures/manifest.json` pins
one pharn-ci commit per supported version line (`pharnCi`: 0.1.0 for Report
v1, 0.2.0 for the 0.2.x accept-label cases, 0.4.0 for the newest cases) and names the newest in `latest`, which is what
`pharn-ci-install` writes; each case names the version it was generated with.
Regenerate them, and the whole-file graders built from the scaffolds' files,
with
`node plugins/pharn-ci/evals/fixtures/regen.mjs --write --pharn-ci 0.1.0=<checkout> --pharn-ci 0.2.0=<checkout> --pharn-ci 0.4.0=<checkout>`
after changing a case's tree or a targeted pharn-ci version; `--check` reports
drift without writing. Each checkout must be pharn-ci at the commit pinned for
its version, built with
`pnpm install --frozen-lockfile && pnpm --filter @pharn-ci/cli... build`, and
Node must be the pinned version. The Action-only accept-label codes are
produced by applying pharn-ci core's own accept-label functions to the case's
gh fixture (`acceptLabel` in the manifest), as the Action does. The
`pharn-ci fixtures` job in `.github/workflows/ci.yml` builds every pinned
commit and runs `--check`; it is not one of the required checks above. Cases that need GitHub or a local CLI carry
a stub `gh` or `pharn-ci` in `./bin` that logs its calls and refuses writes.
The `pharn-ci-cover` cases run the fixture's tests on Node's own test runner,
so they need Node 22 or later and no network; `Edit` and `Write` are granted so
the graders can check which files were and were not changed.
`cover-below-threshold`, `cover-exclude-asks` and `explain-below-threshold`
share one scaffold, as do `install-node-default`, `install-fork-comments` and
`install-test-integrity`, and `explain-ti03-skip` and
`explain-accept-pressure`, and `explain-policy-p02` and
`explain-policy-pressure`; CI checks that the copies match (a unit test checks
the policy pair). A case whose
scaffold and manifest spec are both identical to an earlier case's says
`"sameAs": "<case>"` in the manifest, and the fixture check reuses that case's
regenerated files instead of building it twice (`explain-accept-pressure`
and `explain-policy-pressure` do). The `explain-agent-config-secret` scaffold
assembles its fake token at run time from two halves, so no committed file
holds a literal of a scanned secret shape, and its `no-secret.md` grader
(a regex `not_contains` over the final answer) is the only place that shape
is written.
`explain-accept-ignored` is the same scaffold with its own gh fixture, which
a unit test checks. The `install-*` cases have no generated
artifacts; for them the fixture check also compares `check-coverage.mjs` with
the pinned CLI on the case's coverage (`helperParity` in the manifest) and
checks every pin in `pharn-ci-install/references/workflows.md` against
pharn-ci's README and example workflows.

The two pharn-ci helpers carry one block of coverage-reading code ported from
pharn-ci, between `// <shared:coverage>` markers; a skill directory can be
installed on its own, so they cannot import it from each other. Change both
copies together; a unit test compares them.

To move the pharn-ci skills to a new pharn-ci release:

1. In `plugins/pharn-ci/evals/fixtures/manifest.json`, update the version's
   `sha`, `ref` and `cliVersion` under `pharnCi` (or add a version and move
   `latest`, and `node` if it changes), and the matching checkout in the
   `pharn-ci fixtures` job. `tests/pins.test.mjs` checks that they agree.
2. For the `latest` version, update the commit and its `# <ref>` comment in
   `pharn-ci-install`'s `SKILL.md`, `references/workflows.md` and the
   `install-*` graders, and any action pins pharn-ci's docs changed.
3. Re-check the ported code in the `shared:coverage` blocks and in
   `check-coverage.mjs` against pharn-ci's `packages/core/src`.
4. Re-copy `schema/policy.v1.json` byte for byte to
   `pharn-ci-policy/scripts/policy.v1.json` when the release changes it, update
   the sha256 in `tests/check-policy.test.mjs` and in the header of
   `check-policy.mjs`, and extend the checker only if the schema uses a new
   JSON Schema keyword (it refuses one it does not implement).
5. Run `regen.mjs --write`, the unit tests and the evals, and review the
   skills' text against the release's changelog.

`phargus` evals run in Codex and in Claude Code from `src/phargus`
(`npm run eval`, then `npm run review:evals` per trial, then
`npm run check:evals`); see
[src/phargus/evals/README.md](src/phargus/evals/README.md).

## Releasing

Each plugin is versioned and released on its own; tags are `<plugin>-vX.Y.Z`
(for example `pharn-v0.3.1`, `pharn-ci-v0.1.0`, `phargus-v0.1.0`).

1. In the PR that ships the change, bump the plugin's version and add its
   section to [CHANGELOG.md](CHANGELOG.md), headed `## [<plugin> X.Y.Z] - <date>`
   with a link reference to the tag. For `phargus`, bump `version` in
   `src/phargus/catalog.json` and `package.json`, then run `npm run build`; for
   `pharn` or `pharn-ci`, edit its `.claude-plugin/plugin.json`.
2. For `phargus`, before the release:
   1. `npm run prepare:integration`, then `npm run eval` for all sixteen trials.
      The runner writes the trials to `VERIFICATION.json` and redacted evidence
      to `verification/<run>/`. Check the evidence for anything private.
   2. The maintainer reviews each trial against `src/phargus/evals/README.md`
      and records the decision with `npm run review:evals -- --run <run>
      --client <client> --case <case> --reviewer <github-handle> --accept`
      (or `--reject --note "..."`, then rerun that case).
   3. Commit `VERIFICATION.json` and `verification/<run>/`, summarize the review in
      `VERIFICATION.md`, and confirm `npm run check:evals` passes.
3. After merging, tag the merge commit on `main` and publish one GitHub release
   per tag whose notes are that plugin's changelog section.

## skills.sh synchronization

The `Sync skills.sh` GitHub Actions workflow runs after relevant pushes to `main`,
including PR merges. It installs new and changed skill directories from that
push's commit in a temporary runner directory with Skills CLI telemetry enabled.
Changes to supporting references and scripts also select their parent skill.
Unchanged and deleted skills are skipped; this workflow does not remove old
listings from skills.sh.

Changes to plugin manifests, `skills.sh.json`, or the sync implementation select
all current skills. To seed the existing catalog or retry, run `Sync skills.sh`
manually from the Actions tab on `main`; manual runs select all current skills.
The workflow requires a public repository and uses the built-in `GITHUB_TOKEN`
with read-only permissions. No additional secret is required.

[skills.sh discovers skills through CLI install telemetry](https://skills.sh/docs/faq).
The CLI marks these installs as CI activity. This is a best-effort indexing
request: a successful run confirms installation, but the CLI does not confirm
telemetry delivery or that skills.sh has added or refreshed a listing. Indexing
and page refresh timing remain under skills.sh's control.

## Review and repository settings

[CODEOWNERS](.github/CODEOWNERS) assigns every path to `@PrzemekGalarowicz`.
The target `main` rules require PRs, the five checks above, an up-to-date branch,
resolved review threads, and one approval from the code owner. New code changes
invalidate existing approvals. Force pushes and branch deletion are blocked.

The maintainer account has a PR-only exception to the review requirement so it
can merge its own PRs, which GitHub does not allow it to approve. A separate
ruleset still requires PRs and successful CI for that account. Software using
the maintainer's credentials receives the same exception; GitHub cannot
distinguish it from the human maintainer.

[Repository settings](.github/rulesets/README.md) describes the versioned rules
and their post-merge activation. Committing these files does not activate the
rules; the [live GitHub rules](https://github.com/pharn-dev/skills/rules) are the
source of truth for current enforcement. Dependency updates require review and
CI through the same process, with no automatic merge.
