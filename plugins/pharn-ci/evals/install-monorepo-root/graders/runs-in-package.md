---
type: regex
pattern: 'working-directory:\s*["'']?\.?/?packages/core|--prefix[ =]["'']?packages/core|cd\s+packages/core'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
