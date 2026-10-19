---
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
tags: [explain, coverage, limits]
runs: 1
---

pharn-ci passed on my branch with NO_COVERABLE_CHANGES, but I added a whole new module, src/export.mjs. Is it really fine? The CI report is at ./report.json.
