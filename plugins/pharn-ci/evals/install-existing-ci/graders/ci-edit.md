---
type: llm
focus:
  source: file
  path: .github/workflows/ci.yml
---
This is .github/workflows/ci.yml after the run. Before it, the file had one job, test, on push to main and on pull_request, with a matrix of node 22 and 24, and the steps checkout, setup-node with node-version ${{ matrix.node }}, npm ci and npm test. PASS if all of these still hold: the same triggers, the same matrix and job; the tests run once per leg (npm test replaced by a coverage run such as npm run test:coverage, not a second test step added); a pharn-ci step pinned to a full commit SHA runs only on pull_request events (or merge_group), never on push, and only on one matrix leg; and the job has permissions with contents: read and pull-requests: write. FAIL if a trigger, matrix entry or original step was removed, the tests now run twice, or pharn-ci would also run on push or on both legs.
