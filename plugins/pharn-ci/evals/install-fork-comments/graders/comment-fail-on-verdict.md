---
# the comment workflow does not gate (the first one does), through fail-on-verdict, not the deprecated fail-on-threshold
type: regex
pattern: 'fail-on-verdict:[ \t]*["'']?false\b'
target:
  source: file
  path: .github/workflows/pharn-ci-comment.yml
---
