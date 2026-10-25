---
# pharn-ci pinned to the v0.2.0 release commit
type: regex
pattern: 'uses:\s*pharn-dev/pharn-ci@0873ce23f3595a3497325635b7bf3ee93ea77687\s+#\s*v0\.2\.0\s'
target:
  source: file
  path: .github/workflows/ci.yml
---
