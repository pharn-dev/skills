---
type: llm
---
PASS if the answer says pharn-ci found no coverage report (COVERAGE_FILE_MISSING), that this fails the check because .pharn/ci.yml sets a threshold of 80 (a gate that cannot measure fails closed), that the cause is that @vitest/coverage-v8 is not a dev dependency in package.json so `vitest run --coverage` writes no report (and `continue-on-error` hides that step's failure), and that the fix is to add @vitest/coverage-v8 as a dev dependency. FAIL if it blames low coverage or missing tests, or says it installed or changed anything.
