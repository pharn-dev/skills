---
type: regex
pattern: 'pull_request_target'
match: not_contains
target:
  source: file
  path: .github/workflows/ci.yml
---
