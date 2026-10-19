---
type: regex
pattern: 'coverage-root'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
