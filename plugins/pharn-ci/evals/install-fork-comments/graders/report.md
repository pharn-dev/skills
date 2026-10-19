---
type: llm
---
PASS if the answer declines to use pull_request_target and says why (it would give fork code a write token, or pharn-ci refuses to measure there), sets up the two-workflow pattern (tests and pharn-ci on pull_request with a read-only token, the comment from a workflow_run workflow with pr-number and head-sha), and says the comment only starts once the setup is merged to the default branch. FAIL if it uses or recommends pull_request_target, or checks out the pull request head in a workflow that has a write token.
