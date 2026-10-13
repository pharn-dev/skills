# Verification — Phargus

## Current status: no reviewed run

No behavioral review of the shipped content has been recorded under the
current process. `npm run check:evals` fails with "no reviewed run for
fingerprint …", and it will keep failing until a reviewed run is committed.
That is the expected state for 0.1.1. Deterministic checks and integration pass
(see below). No released version of `phargus` has a reviewed run that anyone
other than its reviewer can check. The 0.1.0 review is archived as
[self-attested](#historical-self-attested-records).

## How behavior is verified

[VERIFICATION.json](VERIFICATION.json) is written only by tools. Nobody edits it
by hand.

1. **The runner writes the rows.** `npm run eval` adds a run (fingerprint,
   plugin version, Node, client and model settings, tested runtime) and one trial
   per client and case. Each trial records its status (`passed-automatic`,
   `failed` or `blocked`) and starts with `semanticReview: "pending"`.
   An `automaticDigest` covers these fields.
2. **Redacted evidence is committed.** For every executed trial the runner writes
   `final.json` (the structured final response), `tool-result.json` (the helper
   output) and `commands.json` (the shell commands in the trace) under
   `verification/<run>/<client>/<case>/`. Before writing, it replaces the trial
   project, repository, Node binary, temp and home paths, the user name, values of
   secret-named environment variables, and token-like strings with placeholders
   such as `<project>` or `<redacted>`. It refuses to write evidence that still
   contains any of them. Each file's repository-relative path and SHA-256 are
   recorded in the trial. Raw transcripts stay in the ignored `evals/results/<run>/`.
3. **A human signs off.** The reviewer reads the raw transcript and the committed
   evidence against the rubric in [evals/README.md](evals/README.md), then records
   one decision per trial:

   ```bash
   npm run review:evals -- --run <run> --client <codex|claude> --case <case> \
     --reviewer <github-handle> --accept [--note "..."]
   npm run review:evals -- --run <run> --client <codex|claude> --case <case> \
     --reviewer <github-handle> --reject --note "failed rubric item"
   ```

   This is the only command that sets `semanticReview`, `signedOffBy` (a GitHub
   handle), `signedOffAt` and `reviewNote`. It accepts only a pending trial that
   passed its automatic checks, for the current fingerprint, with intact evidence.
   Decisions are final: a mistaken or rejected trial is rerun, not edited.

4. **The gate checks the evidence.** `npm run check:evals` passes only if, for the
   current behavior fingerprint, the latest trial of each case in each client
   passed its automatic checks and was accepted under a GitHub handle, with
   unchanged digests, and every evidence file exists with its recorded SHA-256.
   Earlier attempts stay in the file as history; a rerun supersedes them.

The digests show when someone has edited a runner- or reviewer-written field.
They are consistency checks, not signatures. The trust comes from the evidence
committed next to the record and from the sign-off arriving in a pull request
that the code owner reviews. The person named in `signedOffBy` must be the one
who ran the review. An agent must not sign off on anyone's behalf.

The behavior fingerprint hashes `runtime/`, `knowledge/`, the shipped skills,
`catalog.json` and `compatibility.json`. VERIFICATION.json and `verification/`
are outside it, so committing a reviewed run does not invalidate it. Release
archives include VERIFICATION.json and the historical records at the top of
`verification/`, but not the per-run evidence, which stays in the repository at
the tagged commit.

## 0.1.1: behavioral review pending

0.1.1 repins the tested runtime to the published release: tag v0.1.0, commit
819a795875fc547e7daeccc0f0b50846ba642286, @pharn-dev/phargus 0.1.0. The helpers
now accept installed versions >=0.1.0 <0.2.0 instead of exactly 0.0.1, and the setup
reference installs from npm, with a v0.1.0 tag build as the fallback.
The old pin 4219f480 has the same tree as the upstream squash merge 3831198.
From there to v0.1.0, upstream changed only release packaging, workflows and
documentation, plus the package version and the removal of "private": true.
Nothing under src/ or test/ changed.

Checked on 2026-10-13 with Node 22.18.0 and 24.13.1:

- 43 unit tests and 15 integration tests passed on each version, with none skipped.
  The integration build of the tag was verified against the local v0.1.0 tag; its
  tarball SHA-256 is b6d893d1b8124185f9660a9a00ec9d0205afd3e6e7fd51e5277a43bb02b81f16.
- The files of @pharn-dev/phargus 0.1.0 installed from npm are byte-identical to
  that tag build. The 15 integration tests also passed against the npm-installed
  package on Node 24.13.1.
- Format, lint, typecheck, generated resources, skill metadata, copied packages,
  Markdown lint and claude plugin validate --strict passed.

Before release: run all sixteen trials (`npm run prepare:integration`, then
`npm run eval`), have a maintainer review and sign off each trial with
`npm run review:evals`, commit VERIFICATION.json and `verification/<run>/`, and
confirm `npm run check:evals` passes.

## Historical, self-attested records

These records predate the current process. Their reviewers were AI assistants,
not named humans. Their rows were edited by hand, and their evidence lived in
the ignored `evals/results/` of a local checkout, so nobody else can check it.
They are kept as history and do not count toward the gate.

- phargus 0.1.0, reviewed 2026-10-11 after the Argus-to-Phargus rename:
  [0.1.0-self-attested.md](verification/0.1.0-self-attested.md) and
  [0.1.0-self-attested.json](verification/0.1.0-self-attested.json).
- argus 0.1.0 before the rename:
  [pre-rename.md](verification/pre-rename.md) and
  [pre-rename.json](verification/pre-rename.json), preserved byte for byte.

## Migration outside this checkout

- Existing plugin users must uninstall argus@pharn-dev and install phargus@pharn-dev.
  Replace standalone `argus-*` skills with the corresponding `phargus-*` directories.
- Migrate application imports, PHARGUS_* variables, configuration filenames and
  application-owned .phargus/ recipes together with the renamed runtime.
- The versioned ruleset requires Phargus (Node 22.18.0) and Phargus (Node 24).
  A live-rule read on 2026-10-11 showed only Validate and Markdown lint required.
  Apply the versioned target separately if the additional checks should be enforced.
- The skills.sh sync workflow requests new listings after merge; it cannot remove
  old argus-* listings. Public plugin-directory listings also need separate updates.
- Tag and publish manually after deterministic checks and the model gate pass.
