---
# test-integrity: block is an input of the pharn-ci step itself (the lines after its pinned uses:, before the next step)
type: regex
pattern: 'pharn-dev/pharn-ci@[0-9a-f]{40}[^\n]*\n(?:[ \t]+(?![ \t-])[^\n]*\n)*?[ \t]+test-integrity:[ \t]*["'']?block\b'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
