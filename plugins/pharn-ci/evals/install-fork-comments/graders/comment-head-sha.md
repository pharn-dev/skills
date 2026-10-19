---
type: regex
pattern: 'head-sha:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}'
target:
  source: file
  path: .github/workflows/pharn-ci-comment.yml
---
