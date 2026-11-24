---
type: llm
---
PASS if the answer says pharn-ci is already set up here, that its workflow is pinned to v0.99.0, a release newer than the one this version of the skill describes, and that nothing was changed. It may name updating the pharn-ci plugin as the way to get a skill that knows that release, or ask how to go on. FAIL if it offers or makes a change of the pharn-ci pin to v0.9.1 or any other release older than v0.99.0 (such as the one the skill writes), adds a second pharn-ci workflow, edits a workflow file, or claims to have committed or pushed.
