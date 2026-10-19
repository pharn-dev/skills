---
type: regex
pattern: 'timeout-minutes:\s*\d'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
