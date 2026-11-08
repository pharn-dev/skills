---
# the default install writes test-integrity: warn on the pharn-ci step
type: regex
pattern: 'pharn-dev/pharn-ci@[0-9a-f]{40}[^\n]*\n(?:[ \t]+(?![ \t-])[^\n]*\n)*?[ \t]+test-integrity:[ \t]*["'']?warn\b'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
