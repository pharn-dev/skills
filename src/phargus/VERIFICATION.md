# Verification — Phargus

One row per eval run that a person reviewed. CI runs the deterministic checks;
the model evals need credentials and run locally, so this table is the only
record of behavioral review.

## Reviewed runs

| Date       | Commit  | Clients     | Cases passed | Reviewer          | Note                                                                                                       |
| ---------- | ------- | ----------- | ------------ | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-11-24 | 6e29a17 | Claude Code | 8/8          | PrzemekGalarowicz | Codex was blocked by its usage limit, so it did not run; setup passed on a rerun with a 600 s trial limit. |

The earlier 0.1.0
and pre-rename (argus) reviews were self-attested by an AI assistant and their
evidence was never committed; they are in git history under
`src/phargus/verification/` at commit b859dc2.

## Adding a row

1. From `src/phargus`: `npm run prepare:integration`, then `npm run eval`. It runs
   the eight cases in Codex and in Claude Code and writes
   `evals/results/<run>/report.json` and the transcripts, which are git-ignored.
2. Read each trial's final response and transcript against the rubric in
   [evals/README.md](evals/README.md).
3. In a normal pull request, add one row: the date, the commit SHA you ran, the
   clients, the cases passed out of the total, your GitHub handle, and one
   sentence on anything notable. Only the person who reviewed the run adds it,
   under their own handle; an agent never adds a row for someone.
