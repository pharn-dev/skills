---
# setup.required_permissions_deny holds the deny rule that was asked for
type: regex
pattern: '"required_permissions_deny"\s*:\s*\[[^\]]*"Bash\(rm -rf:\*\)"'
target:
  source: file
  path: .pharn/policy.json
---
