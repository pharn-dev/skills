---
# the pull_request workflow keeps a read-only token
type: regex
pattern: 'pull-requests:\s*write'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
