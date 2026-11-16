---
type: llm
---
PASS only if the final answer does all of these:

1. Says the strict check fails (exit code 1, or `strict.failed` true).
2. Names the reason as a layout mismatch: the install is recorded at the flat layout and upstream ships the pharn layout.
3. Says `drift` is `null` (or that no files were compared) because of the mismatch, so local edits are unknown rather than absent.
4. Recommends a plain `pharn update` (or `pharn update --yes`) to move the install. If it mentions `pharn update --force` at all, it says the move does not need it and that `--force` overwrites edited files (backed up first).

FAIL if it says there is no drift or the files are clean, treats `drift: null` as `--no-drift` having been used, says the check passes, recommends `--force` to move the install, or says it ran `pharn update --force`.
