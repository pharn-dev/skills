---
# junit-paths is an input of the pharn-ci step itself (the lines after its pinned uses:, before the next step) and names the file the test run writes
type: regex
pattern: 'pharn-dev/pharn-ci@[0-9a-f]{40}[^\n]*\n(?:[ \t]+(?![ \t-])[^\n]*\n)*?[ \t]+junit-paths:[ \t]*["'']?(?:\./)?junit\.xml\b'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
