# pharn-dev/skills

Agent skills and a Claude Code plugin marketplace from pharn-dev. PHARN gets
features shipped right with Claude Code, and its spec, plan and checks stay in
Git, so months later you can answer "what was done and why?". The `pharn` plugin
here keeps a project's PHARN installation current; `argus` adds Node.js runtime
diagnosis.

| Plugin | Skills | For |
| ------ | ------ | --- |
| `pharn` | `pharn-cli` | The [PHARN CLI](https://github.com/pharn-dev/pharn-cli) (`@pharn-dev/pharn`, written for 0.10.0, with a fallback for older CLIs) and the PHARN installation in a project |
| `argus` | `argus-setup`, `argus-diagnose`, `argus-verify`, `argus-memory`, `argus-rules` | [Argus](https://github.com/pharn-dev/argus) in a Node.js application: setup, runtime diagnosis, fix verification, memory analysis and alert rules |

## Install

### Skills CLI (`npx skills`)

With Node.js and npm installed, run the [Skills CLI](https://github.com/vercel-labs/skills)
to choose skills and the agent to install them for:

```bash
npx skills add pharn-dev/skills
```

You can also list the available skills or select them explicitly:

```bash
# List all available skills without installing
npx skills add pharn-dev/skills --list

# Install all available skills for Claude Code
npx skills add pharn-dev/skills --skill '*' --agent claude-code

# Install only the PHARN CLI skill for Claude Code
npx skills add pharn-dev/skills --skill pharn-cli --agent claude-code

# Install an Argus skill for Codex
npx skills add pharn-dev/skills --skill argus-diagnose --agent codex
```

Installs apply to the current project by default. Add `-g` to make the skill
available across projects:

```bash
npx skills add pharn-dev/skills --skill pharn-cli --agent claude-code -g
```

The CLI installs each skill with its bundled references and scripts. For a full
plugin installation, use the marketplace commands below.

### Plugin marketplaces

Claude Code:

```text
/plugin marketplace add pharn-dev/skills
/plugin install pharn@pharn-dev
/plugin install argus@pharn-dev
```

Codex (`argus` only):

```bash
codex plugin marketplace add pharn-dev/skills
codex plugin add argus@pharn-dev
```

If you added the old `pharn-dev/argus-ai` marketplace, remove it first
(`claude plugin marketplace remove pharn-dev`, or the `codex` equivalent): it
used the same marketplace name.

## Where a skill lives

- Agent skills for operating pharn-dev's tools live here, one plugin per
  product, in `plugins/<plugin>/`.
- A plugin whose files are generated keeps its sources and tooling in
  `src/<plugin>/`. `argus` is built from `src/argus/`.
- The PHARN methodology's own commands (`/pharn-plan`, `/pharn-ship`, ...) are
  not skills from this repo: the `pharn` CLI installs them into a project from
  [pharn-oss](https://github.com/pharn-dev/pharn-oss).

## Codex

`argus` is verified on Codex; its marketplace is `.agents/plugins/marketplace.json`.
`pharn` has not been verified against Codex yet and is not listed there.

## Develop

Needs Claude Code (verified with 2.1.295) and Node 24. `argus` needs Node
22.18.0 or later and npm.

```bash
# validate the marketplace and the plugin
claude plugin validate --strict .
claude plugin validate --strict plugins/pharn
claude plugin validate --strict plugins/argus

# lint Markdown
npx markdownlint-cli2 "**/*.md"

# run the evals
claude plugin eval plugins/pharn --scaffold --allow-tools Bash --trust-plugin --no-publish
```

Evals need model credentials, so CI does not run them. For behavior changes,
the coordinator runs them locally before merging; see [CONTRIBUTING.md](CONTRIBUTING.md).

Each eval case builds a throwaway project with a stub `pharn` executable
(`scaffold.sh`, which is why `--scaffold` is needed). The stub prints canned
0.10.0-shaped output, logs its calls and needs no network, so the real CLI is
never invoked. `--allow-tools Bash` is needed because the cases drive the stub
through Bash. A stub cannot test how the skill finds a real CLI on `PATH`; the
prompts name the stub's path instead.

### skills.sh synchronization

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

### argus

Edit `SKILL.md` files in `plugins/argus/skills/`, shared references in
`src/argus/knowledge/` and helpers in `src/argus/runtime/`, then regenerate.
Everything else under `plugins/argus/` is generated; never edit it by hand.

```bash
cd src/argus
npm ci
npm run build    # regenerate plugins/argus
npm run format && npm run check:generated && npm run check:skills
npm run lint && npm run typecheck && npm test
npm run prepare:integration    # builds the pinned Argus from ../argus next to this repo
npm run test:integration && npm run check:package
npm run eval && npm run check:evals    # model gate: 8 cases in Codex and in Claude Code
```

See [src/argus/README.md](src/argus/README.md) and
[src/argus/evals/README.md](src/argus/evals/README.md).

## Community and security

For bugs and proposals, use the [issue forms](https://github.com/pharn-dev/skills/issues/new/choose).
See [CONTRIBUTING.md](CONTRIBUTING.md) for development and review requirements,
and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
Read [LIMITS.md](LIMITS.md) for tested compatibility and operational limits,
and [THREAT-MODEL.md](THREAT-MODEL.md) for trust boundaries and safeguards.

## License

[Apache 2.0](LICENSE).
