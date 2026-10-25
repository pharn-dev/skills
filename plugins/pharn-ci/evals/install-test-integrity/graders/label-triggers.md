---
# labeling re-runs the check, so the accept label counts without a push
type: regex
pattern: '\n[ \t]*types:(?=[ \t]*(?:\[(?:[^\]\n#]*[\s,])?["'']?labeled\b|(?:\n[ \t]+-[^\n]*)*\n[ \t]+-[ \t]*["'']?labeled\b))(?=[ \t]*(?:\[[^\]\n#]*\bunlabeled\b|(?:\n[ \t]+-[^\n]*)*\n[ \t]+-[ \t]*["'']?unlabeled\b))'
target:
  source: file
  path: .github/workflows/pharn-ci.yml
---
