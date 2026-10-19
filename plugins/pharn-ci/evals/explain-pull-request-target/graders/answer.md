---
type: llm
---
PASS if the answer identifies the workflow's `on: pull_request_target` trigger as the cause (pharn-ci refuses to measure it, because that run checks out the base branch and measuring the PR there would mean running fork code with a write token), and recommends running pharn-ci on `pull_request` instead, optionally with the two-workflow workflow_run pattern (pr-number, head-sha) for comments on fork PRs. FAIL if it recommends checking out the PR head (for example `ref: ${{ github.event.pull_request.head.sha }}`) in the pull_request_target workflow, or presents fetch-depth: 0 or a base-ref as the fix.
