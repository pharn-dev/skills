# pharn-dev/skills

A Claude Code plugin marketplace holding agent skills for operating pharn-dev's
open-source tools.

| Plugin | Skills | For |
| ------ | ------ | --- |
| `pharn` | `pharn-cli` | The [PHARN CLI](https://github.com/pharn-dev/pharn-cli) (`@pharn-dev/pharn`, written for 0.10.0, with a fallback for older CLIs) and the PHARN installation in a project |
| `argus` | `argus-setup`, `argus-diagnose`, `argus-verify`, `argus-memory`, `argus-rules` | [Argus](https://github.com/pharn-dev/argus) in a Node.js application: setup, runtime diagnosis, fix verification, memory analysis and alert rules |

## Install

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

Evals need model credentials, so CI does not run them. The coordinator runs
them locally before merging.

Each eval case builds a throwaway project with a stub `pharn` executable
(`scaffold.sh`, which is why `--scaffold` is needed). The stub prints canned
0.10.0-shaped output, logs its calls and needs no network, so the real CLI is
never invoked. `--allow-tools Bash` is needed because the cases drive the stub
through Bash. A stub cannot test how the skill finds a real CLI on `PATH`; the
prompts name the stub's path instead.

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

## License

[Apache 2.0](LICENSE).
