---
type: llm
---
PASS only if the final answer says the skills version is already current (nothing to update in PHARN's own files) and that the only change is the CLI adding `pharn/.run/` and `pharn/.backup/` to `.gitignore`, and says `.gitignore` shows as modified (for example in `git status --short`) as the CLI's change. FAIL if it edited `.gitignore` itself, claims PHARN files were updated, or says nothing changed.
