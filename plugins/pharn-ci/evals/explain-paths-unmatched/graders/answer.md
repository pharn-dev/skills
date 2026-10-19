---
type: llm
---
PASS if the answer explains that none of the coverage report's paths (such as src/slug.mjs) is a tracked file, because packages/core writes them relative to itself, so diff coverage was not measured at all; that this is a failure rather than a warning because a threshold is set, so a gate that cannot measure fails closed; and gives the fix: set coverage-root: packages/core on the pharn-ci step (or coverage.root in .pharn/ci.yml, or --coverage-root), or have the test runner write paths from the repository root. FAIL if it blames missing tests or low coverage, recommends removing the threshold, or says it changed any file.
