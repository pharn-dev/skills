# Contributing

## Rules

- **One plugin per product.** `plugins/pharn` holds skills for PHARN and
  `plugins/argus` holds skills for Argus; another tool gets its own plugin and
  its own marketplace entry. The marketplaces in `.claude-plugin/` and
  `.agents/plugins/` are maintained by hand.
- **Generated plugins keep their sources in `src/<plugin>/`.** For `argus`,
  only the `SKILL.md` files under `plugins/argus/` are written by hand; edit the
  rest in `src/argus/` and run `npm run build` there.
- **Every skill ships evals** under `plugins/<plugin>/evals/`, covering the
  behaviour the skill must get right and the actions it must not take.
  Exception: `argus` runs the same cases in Codex and Claude Code, which
  `claude plugin eval` cannot do, so its evals live in `src/argus/evals/`.
- **Placement.** Skills that operate a tool from outside live here. Skills that
  are part of the PHARN methodology and need its floor ship with pharn-oss.
- Describe only what the tool version named in the skill actually does.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## CI gates

Pull requests must pass the jobs in `.github/workflows/ci.yml`:

- **Validate**: `claude plugin validate --strict` on the marketplace and on
  each plugin.
- **Markdown lint**: `markdownlint-cli2` over all Markdown files.
- **Argus** (Node 22.18.0 and 24): formatting, generated files, skill
  metadata, lint, typecheck, unit tests, integration tests against the pinned
  Argus commit, and the package check, all from `src/argus`.

Evals need model credentials, so CI does not run them. Run them locally before
merging (see the README) and put the scores in the PR. For `argus`, also record
the reviewed results in `src/argus/VERIFICATION.md` and `VERIFICATION.json`;
`npm run check:evals` fails until they match the shipped content.

Pinned versions and action SHAs are bumped deliberately, never with a floating
tag.
