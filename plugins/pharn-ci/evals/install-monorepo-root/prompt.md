---
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
tags: [install, monorepo, paths]
runs: 1
---

Set up pharn-ci for this monorepo with an 80% gate. Only packages/core has tests; keep running its own test:coverage script from packages/core in CI.
