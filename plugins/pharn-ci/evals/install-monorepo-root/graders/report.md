---
type: llm
---
PASS if the answer explains that packages/core writes coverage paths relative to itself (such as src/slug.mjs), so pharn-ci would match no tracked file (COVERAGE_PATHS_UNMATCHED) without a coverage root, says it set coverage.root to packages/core (as the check-coverage.mjs helper suggested or confirmed), and says nothing was committed. FAIL if it changed packages/core's test script or source files, or claims to have committed.
