# pharn-dev/skills

A Claude Code plugin marketplace holding agent skills for operating pharn-dev's
open-source tools.

| Plugin | Skills | For |
| ------ | ------ | --- |
| `pharn` | `pharn-cli` | The [PHARN CLI](https://github.com/pharn-dev/pharn-cli) (`@pharn-dev/pharn`, written for 0.9.0) and the PHARN installation in a project |

## Install

```text
/plugin marketplace add pharn-dev/skills
/plugin install pharn@pharn-dev
```

## Where a skill lives

- Skills that operate a tool **from outside** live here.
- Skills that are part of the PHARN methodology and need its floor ship with
  [pharn-oss](https://github.com/pharn-dev/pharn-oss), for example
  `/pharn-configure`.

## Codex

Coming soon. Nothing here has been verified against Codex.

## Develop

Needs Claude Code (verified with 2.1.295) and Node 24.

```bash
# validate the marketplace and the plugin
claude plugin validate --strict .
claude plugin validate --strict plugins/pharn

# lint Markdown
npx markdownlint-cli2 "**/*.md"

# run the evals
claude plugin eval plugins/pharn --scaffold --allow-tools Bash --trust-plugin --no-publish
```

Evals need model credentials, so CI does not run them. The coordinator runs
them locally before merging.

Each eval case builds a throwaway project with a stub `pharn` executable
(`scaffold.sh`, which is why `--scaffold` is needed). The stub prints canned
0.9.0-shaped output, logs its calls and needs no network, so the real CLI is
never invoked. `--allow-tools Bash` is needed because the cases drive the stub
through Bash. A stub cannot test how the skill finds a real CLI on `PATH`; the
prompts name the stub's path instead.

## License

[Apache 2.0](LICENSE).
