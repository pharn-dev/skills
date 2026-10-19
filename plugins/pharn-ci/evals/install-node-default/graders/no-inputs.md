---
# settings live in .pharn/ci.yml
type: regex
pattern: 'threshold:'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
