---
# agents.protected_paths holds the workflows glob
type: regex
pattern: '"protected_paths"\s*:\s*\[[^\]]*"\.github/workflows/\*\*"'
target:
  source: file
  path: .pharn/policy.json
---
