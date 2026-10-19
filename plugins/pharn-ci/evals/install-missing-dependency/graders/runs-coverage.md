---
type: regex
pattern: 'vitest[^\n]*--coverage|test:coverage'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
