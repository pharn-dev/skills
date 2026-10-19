---
type: regex
pattern: 'ref:\s*\$\{\{\s*github\.event\.(workflow_run|pull_request)\.head'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci-comment.yml
---
