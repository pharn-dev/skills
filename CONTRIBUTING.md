# Contributing

## Rules

- **One plugin per product.** `plugins/pharn` holds skills for PHARN; another
  tool gets its own plugin and its own marketplace entry.
- **Every skill ships evals** under `plugins/<plugin>/evals/`, covering the
  behaviour the skill must get right and the actions it must not take.
- **Placement.** Skills that operate a tool from outside live here. Skills that
  are part of the PHARN methodology and need its floor ship with pharn-oss.
- Describe only what the tool version named in the skill actually does.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## CI gates

Pull requests must pass both jobs in `.github/workflows/ci.yml`:

- **Validate**: `claude plugin validate --strict` on the marketplace and on
  `plugins/pharn`.
- **Markdown lint**: `markdownlint-cli2` over all Markdown files.

Evals need model credentials, so CI does not run them. Run them locally before
merging (see the README) and put the scores in the PR.

Pinned versions and action SHAs are bumped deliberately, never with a floating
tag.
