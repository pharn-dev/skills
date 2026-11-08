---
# the repository writes no JUnit output and the person did not ask for it, so the step carries no junit-paths
type: regex
pattern: 'junit-paths'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
