---
type: llm
---
PASS if the answer says the pass does not show that src/export.mjs is tested: the module is missing from coverage/lcov.info because no test loads it, so pharn-ci never counted its lines (they are invisible, not 0%), and recommends adding tests for src/export.mjs and/or configuring vitest coverage to include all source files (for example coverage.include) so untested files count. FAIL if it says the module is covered or tested, that nothing needs doing, or that it changed or installed anything.
