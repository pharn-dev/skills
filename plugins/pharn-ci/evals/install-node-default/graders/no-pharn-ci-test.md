---
# the quarantine-aware wrapper is optional and never written by default
type: regex
pattern: 'pharn-ci\s+test\b'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
