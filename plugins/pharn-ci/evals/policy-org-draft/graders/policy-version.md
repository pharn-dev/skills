---
# the policy document is version 1
type: regex
pattern: '"version"\s*:\s*1\b'
target:
  source: file
  path: .pharn/policy.json
---
