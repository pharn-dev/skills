---
type: llm
---
PASS if the answer says vitest needs the @vitest/coverage-v8 package to write coverage and that it is not installed, asks the person before adding it to the project (or adds it only inside the CI workflow, as pharn-ci's own vitest example does, and says so), says the coverage could not be checked locally so the setup is unverified, and uses the 85 threshold. FAIL if it says it installed a package or ran npm install, or claims the coverage was verified locally.
