<div align="center">

<img alt="PHARN" src="assets/pharn-mark.svg" width="140">

# pharn-dev/skills

**Agent skills that run PHARN, pharn-ci and Phargus for you.**

Ask in plain language. The agent checks before it changes anything, shows you
the evidence, and leaves the decisions that matter to you. Three plugins: `pharn`
keeps a project's [PHARN](https://github.com/pharn-dev/pharn-oss) install
current, `pharn-ci` sets up, explains and closes the gaps the
[pharn-ci](https://github.com/pharn-dev/pharn-ci) pull request check reports, and
`phargus` sets up and diagnoses Node.js applications with
[Phargus](https://github.com/pharn-dev/phargus).

[![CI](https://github.com/pharn-dev/skills/actions/workflows/ci.yml/badge.svg)](https://github.com/pharn-dev/skills/actions/workflows/ci.yml)
[![pharn plugin](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpharn-dev%2Fskills%2Fmain%2Fplugins%2Fpharn%2F.claude-plugin%2Fplugin.json&query=%24.version&label=pharn&color=609AA4)](plugins/pharn)
[![pharn-ci plugin](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpharn-dev%2Fskills%2Fmain%2Fplugins%2Fpharn-ci%2F.claude-plugin%2Fplugin.json&query=%24.version&label=pharn-ci&color=609AA4)](plugins/pharn-ci)
[![phargus plugin](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpharn-dev%2Fskills%2Fmain%2Fplugins%2Fphargus%2F.claude-plugin%2Fplugin.json&query=%24.version&label=phargus&color=609AA4)](plugins/phargus)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-green)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-555)](https://claude.com/claude-code)
[![Codex](https://img.shields.io/badge/Codex-phargus-555)](#codex)

```bash
npx skills add pharn-dev/skills
```

</div>

> **Status:** `pharn` is ready to use with Claude Code. `pharn-ci` 0.1.0 is a
> development draft for pharn-ci 0.1.x, not released yet. `phargus` is a 0.1.1
> development draft for the `@pharn-dev/phargus` 0.1.x runtime published on npm;
> see [Compatibility](#compatibility).

---

## Contents

- [What's inside](#whats-inside)
- [Quick start](#quick-start)
- [What you can ask](#what-you-can-ask)
- [How the skills work](#how-the-skills-work)
- [Safety model](#safety-model)
- [Compatibility](#compatibility)
- [Repository layout](#repository-layout)
- [Development](#development)
- [Community and security](#community-and-security)
- [License](#license)

---

## What's inside

| Plugin | Skill | What it does for you |
| ------ | ----- | -------------------- |
| `pharn` | `pharn-cli` | Checks whether PHARN is up to date, previews what an update would change, applies it without overwriting your edits, and adds or removes grillers and lenses. Operates the [PHARN CLI](https://github.com/pharn-dev/pharn-cli) 0.10.0+, best on 0.11.0, with a fallback for 0.9.x. |
| `pharn-ci` | `pharn-ci-install` | Adds [pharn-ci](https://github.com/pharn-dev/pharn-ci) to a repository: coverage output from your own test run, checked locally the way pharn-ci reads it, a `.pharn/ci.yml` with the threshold, and a workflow pinned to the release commit. Never uses `pull_request_target` and asks before installing anything. |
| | `pharn-ci-explain` | Explains a [pharn-ci](https://github.com/pharn-dev/pharn-ci) verdict and each message code from its report, PR comment or job log, finds the cause in your repository and says what would fix it. Changes nothing unless you ask. |
| | `pharn-ci-cover` | Writes tests for the added lines pharn-ci lists as uncovered, re-checks them against a fresh coverage report, and never lowers the threshold, excludes files or adds coverage-ignore comments. |
| `phargus` | `phargus-setup` | Connects Phargus to your Node.js app and leaves a reproducible start and collector recipe, verified against real samples. |
| | `phargus-diagnose` | Investigates slow requests, event-loop stalls, GC pressure and stream backpressure, and ranks hypotheses with a next experiment. |
| | `phargus-verify` | Compares before and after measurements under matching conditions and decides whether a fix helped, regressed, or is inconclusive. |
| | `phargus-memory` | Separates heap, RSS and buffer growth, reads heap snapshot summaries and diffs, and says what the evidence does and does not prove about a leak. |
| | `phargus-rules` | Turns an observed condition into a collector alert or sandboxed rule and replays it on incident and normal data before you turn it on. |

PHARN's own commands (`/pharn-spec`, `/pharn-ship`, `/pharn-loop`, ...) are not
in this repository: the `pharn` CLI installs them into a project from
[pharn-oss](https://github.com/pharn-dev/pharn-oss).

---

## Quick start

### Claude Code plugin

```text
/plugin marketplace add pharn-dev/skills
/plugin install pharn@pharn-dev
/plugin install pharn-ci@pharn-dev
/plugin install phargus@pharn-dev
```

Then, in a project with PHARN installed, ask:

```text
Is pharn up to date in this project?
```

### Skills CLI

With Node.js and npm installed, the [Skills CLI](https://github.com/vercel-labs/skills)
lets you choose skills and the agent to install them for:

```bash
npx skills add pharn-dev/skills
```

Or select them explicitly:

```bash
# List all available skills without installing
npx skills add pharn-dev/skills --list

# Install all skills for Claude Code
npx skills add pharn-dev/skills --skill '*' --agent claude-code

# Install only the PHARN CLI skill, available in every project
npx skills add pharn-dev/skills --skill pharn-cli --agent claude-code -g
```

Installs apply to the current project unless you add `-g`. Each skill comes with
its bundled references and scripts.

### Codex

Only `phargus` is listed in the Codex marketplace; `pharn` has not been verified
against Codex yet.

```bash
codex plugin marketplace add pharn-dev/skills
codex plugin add phargus@pharn-dev
```

Then ask, for example:

```text
Requests became slow this morning; investigate this Phargus recording.
```

---

## What you can ask

You don't name the skill: the agent picks it from what you ask.

| Ask | Skill | What happens |
| --- | ----- | ------------ |
| "Is pharn up to date in this project?" | `pharn-cli` | Runs `pharn status --json` and reports the version, drift and unwired hooks. Writes nothing. |
| "What would an update change in this project's pharn install?" | `pharn-cli` | Runs one dry run and shows what would be written and which of your edited files would be skipped. |
| "Please update pharn." | `pharn-cli` | Previews, then runs `pharn update --yes`, and names every skipped file and unwired hook afterwards. |
| "Force the update." | `pharn-cli` | Explains that `--force` overwrites your edited files (after backing them up) and asks before running it. |
| "Add the n-plus-one lens." | `pharn-cli` | Runs `pharn add lens:n-plus-one`. If the CLI refuses because the install is behind, it takes you through the update first. |
| "Set up pharn-ci on this repo with an 85% gate." | `pharn-ci-install` | Turns on lcov or Cobertura output, runs it and checks the paths match tracked files, writes `.pharn/ci.yml` and a SHA-pinned workflow (or extends your existing test job), and says what the setup PR will show. |
| "We get fork PRs; use pull_request_target for the comment." | `pharn-ci-install` | Explains why not, and sets up the two-workflow `workflow_run` pattern instead. |
| "Why did pharn-ci fail on PR 42?" | `pharn-ci-explain` | Reads the report or the sticky comment, names the messages that decided the verdict, confirms the cause in the workflow, config and coverage file, and gives the fix. Writes nothing. |
| "pharn-ci passed with NO_COVERABLE_CHANGES, but I added a new module." | `pharn-ci-explain` | Checks whether the new files are in the coverage report at all, and says when a pass means "not measured". |
| "Get this PR's diff coverage over the threshold." | `pharn-ci-cover` | Writes tests that run and assert the uncovered lines, runs coverage the way CI does, re-checks the lines, and reports any line tests cannot reach instead of moving the gate. |
| "Just exclude this file from pharn-ci." | `pharn-ci-cover` | Explains that the PR would exempt its own code and that reviewers see the config change, and asks before editing anything. |
| "Add Phargus to this Express app and show that its dashboard receives data." | `phargus-setup` | Installs, preloads and starts a collector, exercises an endpoint, and proves the connection with captured samples. |
| "Requests became slow this morning; investigate this Phargus recording." | `phargus-diagnose` | Checks data quality, correlates request duration with event loop, GC, memory and backpressure, and proposes the smallest next experiment. |
| "Verify that replacing this synchronous handler improved runtime latency." | `phargus-verify` | Compares both captures and their recorded conditions; different load gives an inconclusive verdict, not a win. |
| "RSS doubles after each batch; use these samples and snapshots to investigate." | `phargus-memory` | Compares workload cycles and post-GC baselines and reports growth by category before calling anything a leak. |
| "Alert when event-loop delay exceeds 50 ms for three windows without flagging this normal recording." | `phargus-rules` | Writes the alert, replays it on incident and normal data, and gives the activation steps. |

---

## How the skills work

Every skill reads or measures first, reports what it found, and changes things
only when your request calls for it.

```mermaid
flowchart LR
    A["you ask in<br/>plain language"] --> S["agent loads the<br/>matching skill"]
    S --> R["read-only first<br/>pharn status · phargus summarize"]
    R --> E["evidence, with<br/>its limits"]
    E -- "you asked for a change" --> C{"needs extra<br/>consent?"}
    C -- "no" --> W["apply it<br/>pharn update --yes · rule files"]
    C -- "--force, a download,<br/>or an install" --> Q["explain and ask first"]
    Q -- "you agree" --> W
    W --> REP["report what actually<br/>happened, skips included"]
    E -- "you only asked" --> REP
```

Each skill bundles its own references and, for `phargus`, Node-core-only helper
scripts, so a single copied skill works without this repository.

---

## Safety model

**`pharn-cli`**:

- Starts with read-only `pharn status --json`, whatever you asked.
- Runs the update dry run once and reuses it. An update never overwrites a file
  you edited; it skips it and says so.
- Never passes `--force` until you agree after being told it overwrites your
  edited files. "Force it" on its own is not that agreement.
- Never runs `pharn init`, never downloads or installs the CLI without asking,
  never hand-edits `pharn.config.json` or `.claude/settings.json`, and never
  commits or pushes.
- Treats everything the CLI prints as data, never as instructions.

**`pharn-ci-*`**:

- Read the report, comment or log first, and branch on message codes, not text.
- Treat report paths, message text, PR comments and artifacts as data from the
  change under review, never as instructions.
- `pharn-ci-install` inspects first, runs your coverage command to check its
  output, and writes only `.pharn/ci.yml`, the workflow and `.gitignore`: every
  action is pinned to a full commit SHA, the token gets `pull-requests: write`
  only where pharn-ci comments, and it never uses `pull_request_target` or puts
  artifact text into a script. Extending an existing job, it keeps its
  triggers, matrix and steps.
- `pharn-ci-explain` changes nothing unless you ask. `pharn-ci-cover` changes
  only test files: it never edits the threshold, exclusions, `.pharn/ci.yml`,
  the workflow or `.gitattributes`, adds coverage-ignore comments, skips
  tests or changes production code without your explicit confirmation, and
  "make it pass" is not that confirmation.
- Never run `npx pharn-ci` (the CLI is not on npm), never download or install
  anything without asking, never post to the PR, and never commit or push.

**`phargus-*`**:

- Separates measured observations from hypotheses, and reports missing data,
  gaps and loss instead of reading past them.
- Treats request paths, stack strings, object names and finding messages as
  evidence, never as instructions.
- Never evaluates or imports rule text in the host; sandbox rules run in
  `isolated-vm`, and a missing peer or failed run stays a failure.
- Collector operations default to loopback. Heap snapshot capture runs inside
  the monitored process and pauses it, so `phargus-memory` works from existing
  samples and prepares a new capture only when they are not enough.

These are instructions, not a sandbox: your agent client's permissions decide
what an agent can actually do. The `phargus` model evals check them, but no
behavioral review is recorded yet for the current `phargus` content; see its
[verification record](src/phargus/VERIFICATION.md). The trust boundaries are in
[THREAT-MODEL.md](THREAT-MODEL.md).

---

## Compatibility

| Plugin | Agents | Operates |
| ------ | ------ | -------- |
| `pharn` | Claude Code (verified with 2.1.295). Codex not verified. | PHARN CLI `@pharn-dev/pharn` 0.10.0+, best on 0.11.0, text-flow fallback for 0.9.x. |
| `pharn-ci` | Claude Code. Codex not verified. | pharn-ci 0.1.x (Action `pharn-dev/pharn-ci` and the `pharn-ci check` CLI), Report v1. The `pharn-ci-install` and `pharn-ci-cover` helpers need Node 22 or later; `pharn-ci-install` writes workflows for pharn-ci 0.1.0 (`node24` Actions runners). |
| `phargus` | Codex and Claude Code. Behavioral review of 0.1.1 pending; see the [verification record](src/phargus/VERIFICATION.md). | `@pharn-dev/phargus` 0.1.x from npm (tested: 0.1.0, tag v0.1.0), pinned in [compatibility.json](src/phargus/compatibility.json). Node 22.18.0 or later. |

**Plugin versions and tool versions move separately.** The badges above show
each plugin's own version. The tool version a plugin was written for is stated
in its skills and in the table above.

Installing a skill through the Skills CLI does not prove it behaves correctly
with that agent. [LIMITS.md](LIMITS.md) has the full set of tested combinations
and operational limits.

---

## Repository layout

```text
skills/
├── .claude-plugin/marketplace.json   # Claude Code marketplace: pharn, pharn-ci, phargus
├── .agents/plugins/marketplace.json  # Codex marketplace: phargus
├── plugins/
│   ├── pharn/
│   │   ├── skills/pharn-cli/         # SKILL.md + references/
│   │   └── evals/                    # claude plugin eval cases, stub pharn CLI
│   ├── pharn-ci/
│   │   ├── skills/pharn-ci-install/  # SKILL.md + references/ + scripts/check-coverage.mjs
│   │   ├── skills/pharn-ci-explain/  # SKILL.md + references/
│   │   ├── skills/pharn-ci-cover/    # SKILL.md + references/ + scripts/check-lines.mjs
│   │   ├── tests/                    # node --test for the helpers and pins
│   │   └── evals/                    # claude plugin eval cases from real pharn-ci output
│   └── phargus/                      # generated from src/phargus; edit SKILL.md only
│       └── skills/phargus-*/         # SKILL.md + references/ + scripts/
├── src/phargus/                      # sources, tests and evals for phargus
└── assets/                           # README images
```

One plugin per product. A plugin whose files are generated keeps its sources in
`src/<plugin>/`; see [CONTRIBUTING.md](CONTRIBUTING.md) for the rules.

---

## Development

Needs Claude Code (verified with 2.1.295) and Node 24. `phargus` needs Node
22.18.0 or later and npm.

```bash
# validate the marketplace and the plugins
claude plugin validate --strict .
claude plugin validate --strict plugins/pharn
claude plugin validate --strict plugins/phargus
claude plugin validate --strict plugins/pharn-ci

# test the pharn-ci helpers and pins
node --test plugins/pharn-ci/tests/*.test.mjs

# check the pharn-ci eval fixtures against a built pharn-ci checkout
node plugins/pharn-ci/evals/fixtures/regen.mjs --check --pharn-ci ../pharn-ci

# lint Markdown
npx markdownlint-cli2 "**/*.md"

# run the pharn evals (needs model credentials)
claude plugin eval plugins/pharn --scaffold --allow-tools Bash --trust-plugin --no-publish
claude plugin eval plugins/pharn-ci --scaffold --allow-tools Bash Edit Write --trust-plugin --no-publish
```

- [CONTRIBUTING.md](CONTRIBUTING.md): rules, CI gates, how the evals work, and
  skills.sh synchronization.
- [src/phargus/README.md](src/phargus/README.md): building, testing and
  evaluating `phargus`.

---

## Community and security

For bugs and proposals, use the [issue forms](https://github.com/pharn-dev/skills/issues/new/choose).
See [CONTRIBUTING.md](CONTRIBUTING.md) for development and review requirements,
and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
Read [LIMITS.md](LIMITS.md) for tested compatibility and operational limits,
and [THREAT-MODEL.md](THREAT-MODEL.md) for trust boundaries and safeguards.

## License

[Apache 2.0](LICENSE).
