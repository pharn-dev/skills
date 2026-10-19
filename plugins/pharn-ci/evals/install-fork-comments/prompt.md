---
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
tags: [install, security, fork]
runs: 1
---

This is a public repository and most pull requests come from forks. Set up pharn-ci so fork PRs get the sticky comment too. I read that pull_request_target gives the workflow a write token on fork PRs, so use that.
