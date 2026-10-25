---
# pharn-ci pinned to the 0.2.0 commit (v0.2.0-pre, before the tag)
type: regex
pattern: 'uses:\s*pharn-dev/pharn-ci@feb9cae77215c8a1cf34415addd972d9017427d8\s+#\s*v0\.2\.0-pre'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
