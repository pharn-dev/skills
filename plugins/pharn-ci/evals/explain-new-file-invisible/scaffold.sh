#!/usr/bin/env bash
# Builds a vitest project whose feature branch adds a new module, src/export.mjs,
# that no test imports. vitest's coverage config has no `include`, so the module
# is missing from coverage/lcov.info and pharn-ci passes with NO_COVERABLE_CHANGES
# at threshold 80. coverage/lcov.info is the report such a run writes (only the
# loaded src/cart.mjs); report.json is what
# `pharn-ci check --base main --format json` 0.1.0 printed for this exact tree.
# vitest is not installed: nothing here needs the network.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p src test .pharn .github/workflows
printf 'coverage/\nnode_modules/\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "cart",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^4.0.8",
    "vitest": "^4.0.8"
  }
}
EOF
cat > vitest.config.mjs <<'EOF'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
});
EOF
cat > .pharn/ci.yml <<'EOF'
coverage:
  file: coverage/lcov.info
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
      - run: npm run test:coverage
      - uses: pharn-dev/pharn-ci@v0.1.0
        timeout-minutes: 5
EOF
cat > AGENTS.md <<'EOF'
# AGENTS.md

ESM on Node 24 with vitest. `npm test` runs the tests; `npm run test:coverage` writes `coverage/lcov.info`.
EOF
cat > README.md <<'EOF'
# cart

Shopping cart helpers.
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
git checkout -q -b feature/csv-export
cat > src/export.mjs <<'EOF'
const HEADER = ["sku", "name", "price", "quantity"];

function escapeCell(value) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(items) {
  const rows = items.map((item) => HEADER.map((key) => escapeCell(item[key] ?? "")).join(","));
  return [HEADER.join(","), ...rows].join("\n");
}
EOF
cat >> README.md <<'EOF'

`toCsv(items)` in `src/export.mjs` exports a cart as CSV.
EOF
commit "feat: export a cart as CSV"
mkdir -p coverage
cat > coverage/lcov.info <<'EOF'
TN:
SF:src/cart.mjs
FN:1,subtotal
FNDA:1,subtotal
FNF:1
FNH:1
DA:1,1
DA:2,1
DA:3,1
DA:4,2
DA:5,2
DA:6,1
DA:7,1
LF:7
LH:7
BRDA:3,0,0,2
BRF:1
BRH:1
end_of_record
EOF
cat > report.json <<'EOF'
{
  "schemaVersion": "1",
  "tool": {
    "name": "pharn-ci",
    "version": "0.1.0"
  },
  "verdict": "pass",
  "diffCoverage": {
    "format": "lcov",
    "percent": null,
    "threshold": 80,
    "coveredLines": 0,
    "coverableLines": 0,
    "files": []
  },
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
      "level": "info",
      "code": "NO_COVERABLE_CHANGES",
      "text": "No added lines are tracked by the coverage report; nothing to measure."
    }
  ]
}
EOF
