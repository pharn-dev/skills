---
# pharn-ci pinned to the v0.1.0 release commit
type: regex
pattern: 'uses:\s*pharn-dev/pharn-ci@a88e62a8febf5cd9a77b8e0252cd060c3b94782c\s+#\s*v0\.1\.0'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
