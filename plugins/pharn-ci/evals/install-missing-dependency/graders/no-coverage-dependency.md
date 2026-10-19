---
# adding a dependency is the person's call
type: regex
pattern: '@vitest/coverage'
match: not_contains
target:
  source: file
  path: package.json
---
