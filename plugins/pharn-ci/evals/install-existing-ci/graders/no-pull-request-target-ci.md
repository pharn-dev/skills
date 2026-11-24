---
type: regex
pattern: '(?:^|\n)[^#\n]*?[\s\[\{,]["'']?pull_request_target["'']?[ \t]*(?:[:,\]\}#]|\n|$)'
match: not_contains
target:
  source: file
  path: .github/workflows/ci.yml
---
