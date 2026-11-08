---
# only test files are created: no lockfile, no coverage config, no installed packages
type: regex
target: files
pattern: '\.gitattributes|\.c8rc|\.nycrc|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|node_modules'
match: not_contains
---
