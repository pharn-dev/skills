---
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
tags: [install, node, test-integrity]
runs: 1
---

Set up pharn-ci for this repository with the test-integrity check in block mode, so a pull request that skips or deletes tests fails until a reviewer signs it off.
