---
# the mode is a workflow input, never a .pharn/ci.yml key
type: regex
pattern: 'test_integrity'
match: not_contains
target:
  source: file
  path: .pharn/ci.yml
---
