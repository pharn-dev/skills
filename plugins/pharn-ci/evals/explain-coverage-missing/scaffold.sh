#!/usr/bin/env bash
# Builds a vitest project that lists vitest but not @vitest/coverage-v8, so
# `vitest run --coverage` aborts and writes no report; nothing has been run, so
# there is no coverage file. A stub pharn-ci CLI at ./bin/pharn-ci replays what
# the real `pharn-ci check` 0.1.0 printed for this tree: COVERAGE_FILE_MISSING (no
# report discovered), an error because .pharn/ci.yml sets threshold 80, exit 1.
# It logs each call to .pharn-ci-calls.log and needs no network.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p src test bin .pharn .github/workflows
printf 'coverage/\nnode_modules/\nbin/\n.pharn-ci-calls.log\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "cart",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^4.0.8"
  }
}
EOF
cat > .pharn/ci.yml <<'EOF'
coverage:
  threshold: 80
EOF
cat > .github/workflows/pharn-ci.yml <<'EOF'
name: pharn-ci
on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  pharn-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24
      - run: npm ci
      - run: npx vitest run --coverage --coverage.reporter=lcov
        continue-on-error: true
      - uses: pharn-dev/pharn-ci@v0.1.0
        timeout-minutes: 5
EOF
cat > AGENTS.md <<'EOF'
# AGENTS.md

ESM on Node 24 with vitest. `npm test` runs the tests.
EOF
cat > src/cart.mjs <<'EOF'
export function subtotal(items) {
  let sum = 0;
  for (const item of items) {
    sum += item.price * item.quantity;
  }
  return Math.round(sum * 100) / 100;
}
EOF
cat > test/cart.test.mjs <<'EOF'
import { expect, test } from "vitest";
import { subtotal } from "../src/cart.mjs";

test("subtotal sums price times quantity", () => {
  expect(subtotal([{ price: 2.5, quantity: 2 }, { price: 1, quantity: 3 }])).toBe(8);
});
EOF
commit "feat: cart subtotal"
git checkout -q -b feature/free-shipping
cat > src/shipping.mjs <<'EOF'
export function shippingCost(subtotal) {
  return subtotal >= 50 ? 0 : 4.95;
}
EOF
cat > test/shipping.test.mjs <<'EOF'
import { expect, test } from "vitest";
import { shippingCost } from "../src/shipping.mjs";

test("orders of 50 or more ship free", () => {
  expect(shippingCost(50)).toBe(0);
});
EOF
commit "feat: free shipping from 50"
cat > bin/pharn-ci-report.json <<'EOF'
{
  "schemaVersion": "1",
  "tool": {
    "name": "pharn-ci",
    "version": "0.1.0"
  },
  "verdict": "fail",
  "diffCoverage": null,
  "agentSetup": {
    "files": [
      {
        "path": "AGENTS.md",
        "kind": "agents-md"
      }
    ],
    "summary": {
      "byKind": {
        "agents-md": 1
      },
      "tools": [
        "amp",
        "codex",
        "copilot",
        "cursor",
        "jules",
        "opencode",
        "zed"
      ]
    }
  },
  "messages": [
    {
      "level": "error",
      "code": "COVERAGE_FILE_MISSING",
      "text": "No coverage report was found. Looked for: coverage/lcov.info, lcov.info, coverage.xml, coverage/cobertura-coverage.xml, **/coverage.cobertura.xml. Set coverage.file in .pharn/ci.yml, the coverage-file input or --coverage to point at your report."
    }
  ]
}
EOF
cat > bin/pharn-ci <<'STUB'
#!/usr/bin/env bash
# Stub pharn-ci 0.1.0 CLI for one eval: replays the report the real CLI printed here.
dir=$(cd "$(dirname "$0")" && pwd)
echo "pharn-ci $*" >> "$dir/../.pharn-ci-calls.log"
case "${1:-}" in
  -v|--version) echo "0.1.0"; exit 0 ;;
  -h|--help|"") echo "pharn-ci 0.1.0 — can AI coding agents safely work in this repo?"; echo; echo "Usage:"; echo "  pharn-ci check [options]"; echo; echo "Exit codes: 0 pass or warn, 1 fail, 2 usage or runtime error."; exit 0 ;;
  check) ;;
  *) echo "pharn-ci: unknown command \"$1\"" >&2; exit 2 ;;
esac
case " $* " in
  *" --format json "*|*" --format=json "*) cat "$dir/pharn-ci-report.json"; exit 1 ;;
esac
cat <<'MD'
<img src="https://raw.githubusercontent.com/pharn-dev/pharn-ci/main/docs/assets/pharn-logo.svg" alt="pharn" width="48" height="48">

## 🛡️ pharn-ci · ❌ Fail

> [!CAUTION]
> **Fail** · Diff coverage was not computed; 1 agent setup file found.

| Verdict | Diff coverage | Agent setup |
| --- | --- | --- |
| ❌ Fail | not computed | 1 file |

### 🧪 Diff coverage

_Not computed — see messages below._

### 💬 Messages (1)

- ❌ `COVERAGE_FILE_MISSING` No coverage report was found. Looked for: coverage/lcov.info, lcov.info, coverage.xml, coverage/cobertura-coverage.xml, \*\*/coverage.cobertura.xml. Set coverage.file in .pharn/ci.yml, the coverage-file input or --coverage to point at your report.
  - Hint: Run the tests with coverage before pharn-ci, and check the path (`coverage.file`, `coverage-file` or `--coverage`).

### 🤖 Agent setup (1 file)

Agent setup: 1 file · amp, codex, copilot, cursor, jules, opencode, zed

<details>
<summary>Agent setup files (1)</summary>

| Path | Kind |
| --- | --- |
| `AGENTS.md` | agents-md |

</details>

---

<sub>pharn-ci 0.1.0 · report schema v1</sub>
MD
exit 1
STUB
chmod +x bin/pharn-ci
