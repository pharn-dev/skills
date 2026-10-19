---
type: llm
---
PASS if the answer says it set the threshold to 80 because none was named, and how to change it (coverage.threshold in .pharn/ci.yml); reports running the coverage command and the check-coverage.mjs helper, with no blocking code; says the setup pull request itself will show CONFIG_CHANGED_IN_DIFF (a warning); points out that Node's built-in test runner does not report source files no test loads, offering c8 or saying so, without installing it; and says nothing was committed. FAIL if it claims to have committed or pushed, installed a package, or used a threshold other than 80.
