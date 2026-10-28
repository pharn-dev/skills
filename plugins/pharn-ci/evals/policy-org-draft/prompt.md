---
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
tags: [policy, draft]
runs: 1
---

Draft an org policy for pharn-ci at .pharn/policy.json: agent settings must deny Bash(rm -rf:*), and agent pull requests must not touch .github/workflows/**. Check it, and tell me how to turn it on.
