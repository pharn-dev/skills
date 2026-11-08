#!/usr/bin/env bash
# Builds a small Node project whose feature branch adds src/discount.mjs with one
# test (diff coverage 72%, 18/25, against a threshold of 80), appends a line to
# AGENTS.md that names an `npm run lint` script package.json does not have, and
# tightens .pharn/ci.yml to test_integrity mode block. pharn-ci 0.9.0 gives each
# finding a fix object: DIFF_COVERAGE_BELOW_THRESHOLD is add-test,
# CONFIG_CHANGED_IN_DIFF is request-review and SETUP_STALE_SI01 (AGENTS.md:7) is
# none. pharn-ci-report.json is what `pharn-ci check --base main --format json`
# 0.9.0 printed for this exact tree, as CI would have. No network, no
# dependencies: the tests run on Node's own test runner.
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
      - uses: pharn-dev/pharn-ci@fd1795c6ee82a7ae4cfb49998c562b10dafcf64a # v0.9.0
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
cat > test/discount.test.mjs <<'EOF'
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDiscount } from "../src/discount.mjs";

test("a percent code takes its share off the total", () => {
  assert.equal(applyDiscount(50, "spring10"), 45);
});
EOF
cat >> AGENTS.md <<'EOF'
- Lint before you push: `npm run lint`
EOF
cat > .pharn/ci.yml <<'EOF'
# pharn-ci config. CLI flags and Action inputs override these values.
coverage:
  file: coverage/lcov.info
  threshold: 80
test_integrity:
  mode: block
EOF
commit "feat: discount codes"
cat > pharn-ci-report.json <<'EOF'
{
  "schemaVersion": 2,
  "tool": {
    "name": "pharn-ci",
    "version": "0.9.0"
  },
  "verdict": "fail",
  "diffCoverage": {
    "format": "lcov",
    "percent": 72,
    "threshold": 80,
    "coveredLines": 18,
    "coverableLines": 25,
    "files": [
      {
        "path": "src/discount.mjs",
        "percent": 72,
        "coveredLines": 18,
        "coverableLines": 25,
        "uncoveredLines": [
          8,
          9,
          11,
          12,
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
      "level": "error",
      "code": "DIFF_COVERAGE_BELOW_THRESHOLD",
      "text": "Diff coverage 72% is below the threshold of 80%.",
      "fix": {
        "kind": "add-test",
        "hint": "Add tests that run the changed lines listed in the report."
      }
    },
    {
      "level": "warn",
      "code": "CONFIG_CHANGED_IN_DIFF",
      "text": "This change edits files that configure this check: `.pharn/ci.yml`. Review them before trusting the verdict.",
      "fix": {
        "kind": "request-review",
        "hint": "Ask a reviewer to confirm that the change to the files that configure this check is meant."
      }
    },
    {
      "level": "warn",
      "code": "SETUP_STALE_SI01",
      "text": "Agent instruction files name commands that the root package.json or Makefile does not define: `AGENTS.md:7`. An agent that runs them fails or improvises; fix the command or the instruction.",
      "fix": {
        "kind": "none",
        "hint": "Update this agent instruction so it names a script, path or file that exists."
      }
    }
  ],
  "testIntegrity": {
    "mode": "block",
    "source": "config",
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
          "path": "test/discount.test.mjs",
          "language": "js",
          "added": 1,
          "removed": 0,
          "modified": 0,
          "renamed": 0
        }
      ],
      "added": [
        {
          "path": "test/discount.test.mjs",
          "name": "a percent code takes its share off the total",
          "line": 5
        }
      ],
      "removed": [],
      "modified": [],
      "renamed": []
    }
  },
  "setupHealth": {
    "stale": [
      {
        "id": "SI01",
        "path": "AGENTS.md",
        "line": 7,
        "kind": "command",
        "token": "npm run lint",
        "fix": {
          "kind": "none",
          "target": "AGENTS.md:7",
          "hint": "Update this agent instruction so it names a script, path or file that exists."
        }
      }
    ]
  }
}
EOF
