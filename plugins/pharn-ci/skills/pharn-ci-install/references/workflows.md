# Workflow and config templates (pharn-ci 0.2.0)

From pharn-ci 0.2.0's README, `action.yml` and `examples/workflows/`, at
commit `feb9cae77215c8a1cf34415addd972d9017427d8` on main. v0.2.0 is not
tagged yet, so the pin comment reads `v0.2.0-pre`; it moves to the tag's
commit when there is one. Copy the pins exactly; they are the only ones this
skill writes.

## Pins

| Action | Pin |
| ------ | --- |
| pharn-ci | `pharn-dev/pharn-ci@feb9cae77215c8a1cf34415addd972d9017427d8 # v0.2.0-pre` |
| checkout | `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` |
| Node | `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` |
| Python | `actions/setup-python@5fda3b95a4ea91299a34e894583c3862153e4b97 # v7.0.0` |
| .NET | `actions/setup-dotnet@a98b56852c35b8e3190ac28c8c2271da59106c68 # v6.0.0` |
| Rust tools | `taiki-e/install-action@8cca0918f8471c33515202b73f56ab27f2bed283 # v2.87.29` |
| upload | `actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2` |
| download | `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2` |

Go, Java, pnpm and anything else: reuse the step the repository already pins,
or leave `# TODO: pin <action> to a full commit SHA` in place of the `uses:`
line and say so. Never a tag (`@v4`), a branch or a short SHA.

## `.pharn/ci.yml`

```yaml
# pharn-ci settings. The pharn-ci Action and `pharn-ci check` both read this file.
coverage:
  file: coverage/lcov.info
  threshold: 80
```

- `file`: one path, or a block list of paths and globs (`*`, `**`, `?`),
  relative to the repository root. Quote an entry that starts with `*`:
  `- "**/coverage.cobertura.xml"`.
- `threshold`: a plain number from 0 to 100. Missing inputs fail the check
  when it is set, so a broken coverage step cannot pass.
- `root: packages/core` only for package-relative paths in a single package.
- `exclude:` a block list of globs, only for generated code the person agrees
  to leave out.
- Only `coverage`, `setup` and `test_integrity` keys exist; no tabs; no `{}`,
  anchors or `|`. Leave `test_integrity` out: the mode is the workflow's
  `test-integrity` input (see [Test integrity](#test-integrity-and-the-accept-label)).
- An `exclude:` the setup PR adds shows up on that PR as
  `TEST_INTEGRITY_TI14` (a new coverage exclusion): a warning in mode `warn`,
  a failing check in mode `block`.

## New workflow: `.github/workflows/pharn-ci.yml`

```yaml
name: pharn-ci
on:
  pull_request:
    # With test-integrity: block, also run when the accept label changes:
    # types: [opened, synchronize, reopened, labeled, unlabeled]
  # merge_group:   # uncomment only when the repository uses a merge queue

permissions:
  contents: read
  pull-requests: write

# One run per PR at a time, so pushes do not race on the sticky comment. The github.ref
# fallback gives each merge-queue entry its own group, since merge_group has no PR number.
concurrency:
  group: pharn-ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  pharn-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      # Toolchain, dependencies and the coverage command: see below.
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24
      - run: npm ci
      - run: npm run test:coverage
      - id: pharn-ci
        uses: pharn-dev/pharn-ci@feb9cae77215c8a1cf34415addd972d9017427d8 # v0.2.0-pre
        timeout-minutes: 5
        with:
          test-integrity: warn # or block; never in .pharn/ci.yml
      # report.json for pharn-ci-explain and pharn-ci-cover: the comment cuts long lists.
      - if: always() && steps.pharn-ci.outputs.report-path != ''
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: pharn-ci-report
          path: ${{ steps.pharn-ci.outputs.report-path }}
```

- `fetch-depth: 0` lets pharn-ci diff against the PR base locally; a shallow
  checkout falls back to the API and can end in `DIFF_UNAVAILABLE`.
- The pharn-ci step's only input is `test-integrity`; every other setting is
  in `.pharn/ci.yml`.
- Toolchain lines per ecosystem (the coverage commands are in
  [coverage.md](coverage.md)):
  - Node: `setup-node` with `node-version`, then the lockfile's install
    (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`).
  - Python: `setup-python` with `python-version`, then the project's install
    (`pip install -e '.[test]'`, `pip install -r requirements-dev.txt`, ...).
  - .NET: `setup-dotnet` with `dotnet-version`.
  - Rust: `rustup component add llvm-tools-preview`, then `install-action`
    with `tool: cargo-llvm-cov`.
- Required checks are named after the job: a new workflow adds a `pharn-ci`
  check, which the person can make required in their ruleset.

## Existing test job

When a job already runs the tests on `pull_request`, extend it. These edits
only:

1. Its `actions/checkout` step gets `fetch-depth: 0`.
2. Its test command writes coverage, in the same run: `npm test` becomes
   `npm run test:coverage` (or the runner's coverage flags). The tests run
   once.
3. It gets a job-level `permissions:` block with what it had plus
   `pull-requests: write`. A job-level block replaces the workflow-level one
   and the repository default, so copy every permission the workflow already
   grants (`contents: read` at least). When the job publishes, calls `gh` or
   otherwise needs more and you cannot tell what, ask.
4. Two steps at the end:

```yaml
      - id: pharn-ci
        if: (github.event_name == 'pull_request' || github.event_name == 'merge_group') && matrix.node == 24
        uses: pharn-dev/pharn-ci@feb9cae77215c8a1cf34415addd972d9017427d8 # v0.2.0-pre
        timeout-minutes: 5
        with:
          test-integrity: warn
      - if: always() && steps.pharn-ci.outputs.report-path != ''
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: pharn-ci-report
          path: ${{ steps.pharn-ci.outputs.report-path }}
```

- The event condition keeps pharn-ci off `push`: on a push it would gate the
  branch against the previous commit.
- The matrix condition picks one leg (drop it when there is no matrix): the
  legs share one sticky comment and one artifact name.
- Add no `concurrency:` block to someone else's workflow; it would cancel
  their push builds. Without one, an older run can write the comment last.
- Change nothing else: triggers, `paths` filters, the matrix, other steps.
  Adding `labeled` and `unlabeled` to the `pull_request` trigger for the
  accept label re-runs this whole job on every label change: ask first.
- Replacing `npm test` with `npm run test:coverage` (or any command pharn-ci
  does not read as a test command) shows up on the setup PR as
  `TEST_INTEGRITY_TI11`, "A step that runs tests was removed from a
  workflow": a warning in mode `warn`, a failing check in mode `block`. Where
  the runner takes extra flags through the test script, a command that still
  starts with `npm test` (`npm test -- <coverage flags>`) does not fire it.
  Otherwise say the setup PR shows it and why.

## Fork PRs: two workflows

A fork PR's `pull_request` token cannot comment. The comment comes from a
second workflow on `workflow_run`, which runs from the default branch and never
runs PR code. The first workflow uploads before pharn-ci gates, so a failing
gate still gets its comment.

`.github/workflows/pharn-ci.yml`:

```yaml
name: pharn-ci
on: pull_request

permissions:
  contents: read
  pull-requests: read # the accept label, read in test-integrity: block

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      # Toolchain, dependencies and the coverage command, as in the new workflow.
      - env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: echo "$PR_NUMBER" > pr-number
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: pharn-ci-input
          path: |
            coverage/lcov.info
            pr-number
      - uses: pharn-dev/pharn-ci@feb9cae77215c8a1cf34415addd972d9017427d8 # v0.2.0-pre
        timeout-minutes: 5
        with:
          comment: false
          test-integrity: warn
```

`.github/workflows/pharn-ci-comment.yml`:

```yaml
name: pharn-ci comment
on:
  workflow_run:
    workflows: [pharn-ci]
    types: [completed]

permissions:
  contents: read
  pull-requests: write
  actions: read

jobs:
  comment:
    if: github.event.workflow_run.event == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      # The default branch: the trusted .pharn/ci.yml, never the PR.
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: pharn-ci-input
          path: ${{ runner.temp }}/pharn-ci-input
          run-id: ${{ github.event.workflow_run.id }}
          github-token: ${{ github.token }}
      # Keep digits only. The artifact is attacker-controlled: never put its text into a script.
      - id: pr
        env:
          PR_FILE: ${{ runner.temp }}/pharn-ci-input/pr-number
        run: echo "number=$(tr -dc '0-9' < "$PR_FILE" | head -c 10)" >> "$GITHUB_OUTPUT"
      - uses: pharn-dev/pharn-ci@feb9cae77215c8a1cf34415addd972d9017427d8 # v0.2.0-pre
        timeout-minutes: 5
        with:
          coverage-file: ${{ runner.temp }}/pharn-ci-input/coverage/lcov.info
          pr-number: ${{ steps.pr.outputs.number }}
          head-sha: ${{ github.event.workflow_run.head_sha }}
          fail-on-threshold: false # the first workflow already gates
          test-integrity: warn # the same mode as the first workflow
```

- `workflows: [pharn-ci]` must equal the first workflow's `name:`.
- The coverage path in the artifact and in `coverage-file` must match the
  repository's `coverage.file`.
- pharn-ci reads the PR's diff and files through the API in this mode and
  fails when the PR head is not `head-sha`. It cannot tell whether the
  coverage file is what the tests produced: the first workflow's verdict is
  the gate.
- `workflow_run` runs only from the default branch, so the comment starts
  after the setup PR merges. First-time contributors' runs may need a
  maintainer's approval first.
- Never `pull_request_target`: it gives a fork's PR a write token, and
  checking out the PR there runs fork code with it. pharn-ci also refuses to
  measure on it (`DIFF_UNAVAILABLE`).

## Test integrity and the accept label

pharn-ci 0.2.x checks every PR for changes that weaken the tests: a test file
deleted (TI01), a skip added (TI03), `.only`/`fit` added (TI04), a test script
weakened (TI10), CI no longer running tests (TI11), a coverage-ignore comment
(TI13), a lower threshold or a new exclusion in `.pharn/ci.yml` (TI14). Each
finding asks for a reviewer to look; most have an ordinary reason.

- **`test-integrity: warn`** (the default, and what this skill writes): the
  findings are warnings in the comment. Nothing fails because of them.
- **`test-integrity: block`**: a block finding fails the check until it is
  fixed or a reviewer who is not the PR author signs it off with the accept
  label.
- **`off`**: no check. Never write it.

The mode is an Action input, not a `.pharn/ci.yml` key, because the PR under
review carries `.pharn/ci.yml`: pharn-ci lets `test_integrity.mode` there only
make the check stricter than the input (a looser value is ignored with
`TEST_INTEGRITY_MODE_IGNORED`). The workflow is where the floor is set, which
is why CODEOWNERS on `.github/workflows/` matters.

**The accept label** (block mode only). A reviewer who is not the PR author
applies `pharn/accepted` to the PR; the next run turns that PR's block findings
into warnings and the comment names who accepted them. It counts only when the
newest `labeled` event for it was made by a user account other than the PR
author; a bot's or the author's label is ignored with
`TEST_INTEGRITY_ACCEPT_IGNORED`. The label is tied to the PR, not a commit, so
a later push keeps it until someone removes it. Diff coverage is never
affected. For it to work:

- The label must exist in the repository. The person creates it, for example
  `gh label create pharn/accepted --description "Test-integrity findings
  accepted by a reviewer"`; do not run it for them.
- The workflow runs again when the label changes:

  ```yaml
  on:
    pull_request:
      types: [opened, synchronize, reopened, labeled, unlabeled]
  ```

  Otherwise someone pushes or re-runs the check after labeling.
- The token reads the PR and its issue events: `pull-requests: read` or
  `issues: read`. The templates' `pull-requests: write` includes it, and the
  fork template's first workflow has `pull-requests: read`.
- A different label name goes in the `accept-label` input (at most 50
  characters). It is never read from `.pharn/ci.yml`, which refuses
  `test_integrity.accept_label`.
- `push`, `merge_group` and `pull_request_target` runs never read the label,
  so a block there stays a block. With a merge queue and `block`, a PR whose
  findings were accepted still fails its `merge_group` run; say so before
  writing `block` into a workflow that runs on `merge_group`.

## Dependabot

`.github/dependabot.yml`, only with the person's yes:

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```
