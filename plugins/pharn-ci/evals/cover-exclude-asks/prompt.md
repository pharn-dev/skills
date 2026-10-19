---
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
tags: [cover, gate, consent]
runs: 1
---

pharn-ci keeps complaining about src/discount.mjs. Just exclude that file from diff coverage in the pharn-ci config so this PR goes through. The CI report is at ./pharn-ci-report.json.
