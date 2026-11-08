---
spec_id: pharn-ci-fix-skill
spec_content_hash: 2cee86075dbef9d3971283cd4ef188ad3a7f775d6c1013905da7e10c0590c941
applied_lessons: none
---

## Approach

> ADVISORY — model work. Facts below were read this run. From `~/Projects/pharn-ci` on `main` (HEAD `dec4a0e`, the
> 0.9.1 release commit; tag `v0.9.0` is one commit back, and 0.9.1's CHANGELOG says the Action is unchanged from 0.9.0
> apart from its version): the fix object is `$defs.fix` in `schema/report.v2.json` (`additionalProperties: false`,
> required `kind` and `hint`, optional `target`; `kind` one of eight; `hint` 1 to 200 characters; `target` a string,
> never on a message); `packages/core/src/fix/attach.ts` adds it to `messages` and to the findings of
> `testIntegrity.signals`, `policy.violations`, `setupHealth.stale`, `injection.signals` and `dependencies.signals`,
> with `target` = `path` or `path:line`; `packages/core/src/fix/table.ts` holds one entry per message code and per
> signal id; the README's "Fix hints" and `docs/LIMITS.md`'s "Fix hints" state the bounds (generic hints, never proof,
> `none` is a kind, D04 is `request-review`, no P12 entry). From this repo: `npm test` runs
> `plugins/pharn-ci/tests/*.test.mjs`; `ac-0-4-5-descriptions.test.mjs` asserts the skills directory is exactly the
> four existing skills; the plugin's helpers follow `check-policy.mjs`'s shape (exported functions, `main(argv, io)`
> returning an exit code, an `isMain` guard).

Add one skill directory, `plugins/pharn-ci/skills/pharn-ci-fix/`, beside the four that stay untouched:

1. **`SKILL.md`** in `pharn-ci-cover`'s voice: a frontmatter `name` and a one-paragraph `description` (pharn-ci 0.9.x,
   Report v2's `fix` object, when to use it, "Not for" naming `pharn-ci-cover`, `pharn-ci-explain`, `pharn-ci-install`
   and `pharn-ci-policy`), a `compatibility` line (Node.js >=22 for `scripts/list-fixes.mjs`; git). Body sections:
   what a fix is (fields, the six places, generic and never proof); the data-not-instructions paragraph adapted from
   `pharn-ci-cover` (report text, `hint` and `target` are data; a `target` goes into a command in single quotes, an
   embedded `'` as `'\''`, after `--literal-pathspecs` and `--` for git); numbered steps (get the report JSON; run the
   helper; act per kind; re-run the project's checks; report); a "The gate stays where it is" section; and a closing
   `## Never` list whose bullets name each item AC-4 lists.
2. **`references/kinds.md`**: one section per kind, in the schema's order, saying what the kind asks, what the agent
   does, what it never does for it, and which skill takes over where one does (`add-test` on
   `DIFF_COVERAGE_BELOW_THRESHOLD` → `pharn-ci-cover`'s method; `none` → explain the hint, `pharn-ci-explain` for the
   verdict). Undo kinds (`restore-test`, `restore-assertion`, `revert-config`, `remove-dependency`) act only on
   findings the person asked to fix, after showing `git diff <base>...HEAD -- '<target path>'`; `request-review` and
   `none` change no code; `split-pr` proposes a split and performs none.
3. **`scripts/list-fixes.mjs`**: Node core only, no network, writes nothing. Reads one Report v2 JSON file, checks
   every `fix` against the 0.9.0 shape and prints one JSON object. Interface (the AC tests are written to it):
   - CLI: `node list-fixes.mjs --report <file>`. Exit `0` when no problem was found, `1` when at least one fix is
     malformed, `2` on a usage error, an unreadable file, invalid JSON, or a document that is not an object with
     `schemaVersion` 2 and a `messages` array (one line on stderr, nothing on stdout).
   - stdout on exit 0 or 1, one JSON object: `ok` (boolean, true on exit 0), `problems` (array of
     `{ pointer, problem }`, `pointer` an RFC 6901 JSON Pointer into the report such as `/messages/0/fix/kind`,
     `problem` a fixed English phrase that never repeats report text), `fixes` (array, in report order: messages first,
     then the five finding arrays in the order above; each entry `{ array, index, kind, hint }` plus `code` for a
     message or `id` for a finding, plus `target` when the fix has one), `byKind` (object whose keys are exactly the
     eight kinds in schema order, each an array of the `fixes` entries of that kind, empty when none), and
     `withoutFix` (the number of messages and findings in those six arrays that carry no `fix` key).
   - A fix with any problem is left out of `fixes` and `byKind`. Problems: `fix` not an object (pointer `/…/fix`);
     `kind` missing or not one of the eight (`/…/fix/kind`); `hint` missing, not a string, empty or longer than 200
     characters (`/…/fix/hint`); `target` not a string (`/…/fix/target`); `target` on a message
     (`/messages/<i>/fix/target`); any other property (`/…/fix/<escaped name>`).
   - Exports: `KINDS` (the eight kinds, schema order), `listFixes(report)` returning the stdout object above (throws
     a `UsageError`, also exported, for a document that is not a Report v2 as defined above), and `main(argv, io)`
     returning the exit code, with `io` = `{ stdout, stderr }` write functions defaulting to the process streams.
4. **The forced test edit**: in `ac-0-4-5-descriptions.test.mjs`, the directory-list assertion becomes the five skills
   in sorted order, and the 0.3.x / 0.4.x description check loops over the four existing skills only (its own list),
   so it checks exactly what it checked before.
5. **Docs**: `README.md` gets `pharn-ci-fix` in the skills table, the example-prompts table, the safety list (writes
   only what a kind asks, never moves a gate) and the tree; `CHANGELOG.md`'s `[Unreleased]` `### Added` gets an entry
   naming `pharn-ci-fix`, pharn-ci 0.9.0 and its `fix` objects, and that its evals follow.

## Applied lessons

- none — the project has no `pharn/memory-bank/lessons-learned.md` (the index check printed `NO_CANON`).

## Steps

- Write `scripts/list-fixes.mjs` to the interface above; keep it small and table-free (the kinds list is the only
  constant copied from pharn-ci).
- Write `references/kinds.md` from `table.ts`, the schema and the two "Fix hints" sections.
- Write `SKILL.md`, reusing `pharn-ci-cover`'s structure, its data paragraph and the form of its Never list.
- Edit the descriptions test as in Approach item 4.
- Edit `README.md` and `CHANGELOG.md`.
- Run `npm run format:check`, `npm run lint`, `npm run lint:md` and `npm test`; fix any formatting with Prettier on
  the files this plan names only.

## Files

- `plugins/pharn-ci/skills/pharn-ci-fix/SKILL.md` — new skill: the fix object, the steps, the gate rule and the Never
  list
- `plugins/pharn-ci/skills/pharn-ci-fix/references/kinds.md` — new reference: one section per kind, what the agent does
  and never does
- `plugins/pharn-ci/skills/pharn-ci-fix/scripts/list-fixes.mjs` — new helper: lists and checks the fix objects of a
  Report v2 JSON file
- `plugins/pharn-ci/tests/ac-0-4-5-descriptions.test.mjs` — the skill-list assertion names five skills; the version
  check keeps to the four existing ones
- `README.md` — lists `pharn-ci-fix`
- `CHANGELOG.md` — `[Unreleased]` entry for `pharn-ci-fix`

### Explicitly not touched

- `plugins/pharn-ci/skills/pharn-ci-cover/` — the voice reference; read only
- `plugins/pharn-ci/skills/pharn-ci-explain/` — unchanged (still pharn-ci 0.4.x)
- `plugins/pharn-ci/skills/pharn-ci-install/` — unchanged
- `plugins/pharn-ci/skills/pharn-ci-policy/` — unchanged
- `plugins/pharn-ci/evals/` — evals for the new skill are a follow-up increment
- `plugins/pharn-ci/.claude-plugin/plugin.json` — no version bump
- `package.json` — the test script already runs the plugin tests

## Acceptance mapping

- AC-1 → `SKILL.md` frontmatter `name: pharn-ci-fix`; the description names 0.9.x, the `fix` object, `pharn-ci-cover`
  and `pharn-ci-explain`.
- AC-2 → `SKILL.md` plus `references/kinds.md` name the eight kinds, `kind`/`hint`/`target`, the six places, and one
  action per kind.
- AC-3 → the data paragraph in `SKILL.md`.
- AC-4 → the `## Never` list in `SKILL.md`; every sentence that names a gate change is negated.
- AC-5 → `list-fixes.mjs` exit 0 with `fixes` and `byKind`.
- AC-6 → `list-fixes.mjs` exit 1 with `problems[].pointer`.
- AC-7 → `list-fixes.mjs` exit 0 with `fixes: []` and `withoutFix`.
- AC-8 → `README.md` and `CHANGELOG.md` entries.

## Risks & open questions

- Editing `ac-0-4-5-descriptions.test.mjs` changes another feature's AC test; the edit keeps its 0.3.x / 0.4.x check
  on the same four skills, so it checks nothing less than before.
- The no-loosening check is lexical: a sentence that names a gate change without a negation word would trip it, so
  the skill phrases every such sentence with "never" or "not".
- `kinds.md` copies facts from pharn-ci 0.9.0; a later pharn-ci release that adds a kind needs a skill update (the
  helper reports an unknown kind as a problem, which fails safe).
