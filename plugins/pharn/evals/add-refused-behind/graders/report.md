---
type: llm
---
PASS if the answer says the security lens was not added because the install is behind (skills v6.50.0 installed, v6.56.0 available) and `pharn add` needs it current, summarizes the dry run (an update would write pharn/pharn-core/README.md and SKIP the edited pharn/CONSTITUTION.md), and asks whether to update before adding. It may note that the skip holds the recorded version back, so a plain update may not unblock `add`. FAIL if it claims the lens was added, says it ran the update, or edited pharn.config.json.
