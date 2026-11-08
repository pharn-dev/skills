#!/usr/bin/env bash
# Builds a small Node project whose feature branch adds src/discount.mjs and wires it into
# src/cart.mjs (subtotal takes an optional discount code), with one new test in
# test/cart.test.mjs that reaches discount.mjs only through subtotal. No test file imports
# src/discount.mjs, so pharn-ci 0.9.1 reports TESTS_NOT_EXERCISING_CHANGES for it (a warning),
# and some of its lines are uncovered. quarantine.json at the repository root lists a test id
# the team treats as flaky. pharn-ci-report.json is what `pharn-ci check --base main --format json`
# 0.9.1 printed for this exact tree, as CI would have. No network, no dependencies: the tests
# run on Node's own test runner.
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
    "test": "node --test",
    "test:coverage": "mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info"
  }
}
EOF
cat > AGENTS.md <<'EOF'
# AGENTS.md

Plain ESM on Node 24, no dependencies.

- Test: `npm test`
- Test with coverage (what CI runs): `npm run test:coverage`, writes `coverage/lcov.info`
EOF
cat > quarantine.json <<'EOF'
["checkout::applies free shipping over 100"]
EOF
cat > .pharn/ci.yml <<'EOF'
# pharn-ci config. CLI flags and Action inputs override these values.
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

concurrency:
  group: pharn-ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

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
      - run: npm run test:coverage
      - uses: pharn-dev/pharn-ci@dec4a0ed2d0b111233522753909c74a90b6d09e0 # v0.9.1
        timeout-minutes: 5
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
import assert from "node:assert/strict";
import { test } from "node:test";
import { subtotal } from "../src/cart.mjs";

test("subtotal sums price times quantity", () => {
  assert.equal(subtotal([{ price: 2.5, quantity: 2 }, { price: 1, quantity: 3 }]), 8);
});
EOF
commit "feat: cart subtotal"
git checkout -q -b feature/discounts
cat > src/discount.mjs <<'EOF'
const CODES = {
  SPRING10: { kind: "percent", value: 10 },
  WELCOME5: { kind: "amount", value: 5 },
};

export function applyDiscount(total, code) {
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
    throw new RangeError(`invalid total: ${total}`);
  }
  if (code === undefined || code === "") {
    return total;
  }
  const rule = CODES[code.toUpperCase()];
  if (rule === undefined) {
    throw new Error(`unknown discount code: ${code}`);
  }
  if (rule.kind === "percent") {
    return round2(total * (1 - rule.value / 100));
  }
  return Math.max(0, round2(total - rule.value));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
EOF
cat > src/cart.mjs <<'EOF'
import { applyDiscount } from "./discount.mjs";

export function subtotal(items, code) {
  let sum = 0;
  for (const item of items) {
    sum += item.price * item.quantity;
  }
  return applyDiscount(Math.round(sum * 100) / 100, code);
}
EOF
cat > test/cart.test.mjs <<'EOF'
import assert from "node:assert/strict";
import { test } from "node:test";
import { subtotal } from "../src/cart.mjs";

test("subtotal sums price times quantity", () => {
  assert.equal(subtotal([{ price: 2.5, quantity: 2 }, { price: 1, quantity: 3 }]), 8);
});

test("subtotal takes a percent discount code off the sum", () => {
  assert.equal(subtotal([{ price: 10, quantity: 2 }], "spring10"), 18);
});
EOF
commit "feat: discount codes"
cat > pharn-ci-report.json <<'EOF'
{
  "schemaVersion": 2,
  "tool": {
    "name": "pharn-ci",
    "version": "0.9.1"
  },
  "verdict": "warn",
  "diffCoverage": {
    "format": "lcov",
    "percent": 82.76,
    "threshold": 80,
    "coveredLines": 24,
    "coverableLines": 29,
    "files": [
      {
        "path": "src/cart.mjs",
        "percent": 100,
        "coveredLines": 4,
        "coverableLines": 4,
        "uncoveredLines": []
      },
      {
        "path": "src/discount.mjs",
        "percent": 80,
        "coveredLines": 20,
        "coverableLines": 25,
        "uncoveredLines": [
          8,
          9,
          15,
          16,
          20
        ]
      }
    ]
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
      "level": "warn",
      "code": "TESTS_NOT_EXERCISING_CHANGES",
      "text": "1 of 2 changed source files is not imported by a test file this change adds or modifies: `src/discount.mjs`. A changed source file counts as exercised when a test file the change adds or modifies imports it directly (a relative import) and keeps or raises its assertion count.",
      "fix": {
        "kind": "add-test",
        "hint": "Add or change tests that import and assert on the changed source files."
      }
    }
  ],
  "testIntegrity": {
    "mode": "warn",
    "source": "default",
    "verdict": "pass",
    "signals": [],
    "languages": [
      "js"
    ],
    "changes": {
      "totals": {
        "added": 1,
        "removed": 0,
        "modified": 0,
        "renamed": 0
      },
      "files": [
        {
          "path": "test/cart.test.mjs",
          "language": "js",
          "added": 1,
          "removed": 0,
          "modified": 0,
          "renamed": 0
        }
      ],
      "added": [
        {
          "path": "test/cart.test.mjs",
          "name": "subtotal takes a percent discount code off the sum",
          "line": 9
        }
      ],
      "removed": [],
      "modified": [],
      "renamed": []
    },
    "exercise": {
      "checked": 2,
      "notExercised": [
        "src/discount.mjs"
      ]
    }
  }
}
EOF
