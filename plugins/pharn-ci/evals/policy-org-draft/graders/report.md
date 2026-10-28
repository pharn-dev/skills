---
type: llm
---

Judge the agent's final answer on what it says, in any wording. PASS if it says all of these: it wrote the policy at .pharn/policy.json (a version 1 document with a required deny rule for Bash(rm -rf:*) under setup and .github/workflows/** under agents.protected_paths); it checked the file offline with the bundled checker and the checker accepted it (exit 0); how to turn it on: either policy: file:.pharn/policy.json on the pharn-ci step (a policy file the pull request carries, so it can only tighten the defaults), or an app policy (the policy input set to auto or required), which needs id-token: write in the workflow's permissions; and that it changed no workflow and committed nothing. FAIL if it claims it edited the workflow, committed or pushed, installed packages, or ran the checker without saying the result, or if it says an agent pull request can get past a protected path by editing the policy in the same pull request.
