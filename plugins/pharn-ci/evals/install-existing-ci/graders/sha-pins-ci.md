---
# every uses: is a full commit SHA
type: regex
pattern: 'uses:\s*[\w.-]+/[\w./-]+@(?![0-9a-f]{40}\b)'
match: not_contains
target:
  source: file
  path: .github/workflows/ci.yml
---
