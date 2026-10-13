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

- **One plugin per product.** `plugins/pharn` holds skills for PHARN and
  `plugins/phargus` holds skills for Phargus; another tool gets its own plugin and
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
  each plugin.
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
For `phargus`, also record
the reviewed results in `src/phargus/VERIFICATION.md` and `VERIFICATION.json`;
`npm run check:evals` fails until they match the shipped content.

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

`phargus` evals run in Codex and in Claude Code from `src/phargus`
(`npm run eval && npm run check:evals`); see
[src/phargus/evals/README.md](src/phargus/evals/README.md).

## Releasing

Each plugin is versioned and released on its own; tags are `<plugin>-vX.Y.Z`
(for example `pharn-v0.3.1`, `phargus-v0.1.0`).

1. In the PR that ships the change, bump the plugin's version and add its
   section to [CHANGELOG.md](CHANGELOG.md), headed `## [<plugin> X.Y.Z] - <date>`
   with a link reference to the tag. For `phargus`, bump `version` in
   `src/phargus/catalog.json` and `package.json`, then run `npm run build`; for
   `pharn`, edit `plugins/pharn/.claude-plugin/plugin.json`.
2. For `phargus`, `npm run check:evals` must pass before the release.
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
