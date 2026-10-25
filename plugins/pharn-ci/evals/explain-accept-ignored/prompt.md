---
max_turns: 18
allowed_tools: [Read, Glob, Grep, Skill, Bash]
tags: [explain, test-integrity, accept-label, gh]
runs: 1
---

I added the pharn/accepted label to my PR 12 because the skipped test is just flaky, but pharn-ci still fails. Why? Use the gh CLI at ./bin/gh for anything on GitHub (use that path; do not look for gh elsewhere).
