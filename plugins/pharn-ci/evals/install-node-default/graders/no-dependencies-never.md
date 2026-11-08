---
# dependency safety stays on its default (auto): nothing switches it off or on
type: regex
pattern: 'dependencies:'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
