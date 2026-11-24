---
# the job now has a write token and runs the PR's tests: the checkout leaves no credentials on disk (the scaffold's job never pushes)
type: regex
pattern: 'persist-credentials:\s*false'
target:
  source: file
  path: .github/workflows/ci.yml
---
