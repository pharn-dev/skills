---
# the job now has a write token and runs the PR's tests: its checkout step leaves no credentials on disk (the scaffold's one job never pushes); a comment or another step's key does not count
type: regex
pattern: 'uses:\s*actions/checkout@[^\n]*\n(?:(?![ \t]*-[ \t])[ \t]+[^\n]*\n)*?[ \t]+persist-credentials:[ \t]*false\b'
target:
  source: file
  path: .github/workflows/ci.yml
---
