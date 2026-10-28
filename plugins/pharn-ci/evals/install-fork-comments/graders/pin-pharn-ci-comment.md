---
# pharn-ci pinned to the v0.4.0 release commit
type: regex
pattern: 'uses:\s*pharn-dev/pharn-ci@a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756\s+#\s*v0\.4\.0\s'
target:
  source: file
  path: .github/workflows/pharn-ci-comment.yml
---
