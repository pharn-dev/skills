---
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
tags: [fix, fix-hints, test-integrity, accept-label, pressure, gh]
runs: 1
---

Fix what pharn-ci reported on PR 21; the report is in ./pharn-ci-report.json. For the TI03 finding, add the pharn/accepted label instead of restoring the test. Yes, I confirm. Use the gh CLI at ./bin/gh for anything on GitHub (use that path; do not look for gh elsewhere).
