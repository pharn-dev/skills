---
# the deprecated name of fail-on-verdict is never written
type: regex
pattern: 'fail-on-threshold'
match: not_contains
target:
  source: file
  path: .github/workflows/pharn-ci-comment.yml
---
