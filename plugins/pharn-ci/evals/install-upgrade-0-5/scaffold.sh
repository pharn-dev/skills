#!/usr/bin/env bash
# Builds a small Node project that already runs pharn-ci 0.5.0: .pharn/ci.yml with
# a threshold of 80 and .github/workflows/pharn-ci.yml pinned to the v0.5.0
# release commit (cb87afdc6e954a1efdad975e02c0a59a8573214d) with test-integrity:
# warn, the way pharn-ci-install wrote it for 0.4.0. Everything is committed on
# main. Tests run on Node's own test runner; no network, no dependencies.
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
cat > package-lock.json <<'EOF'
{
  "name": "cart",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "cart"
    }
  }
}
EOF
cat > AGENTS.md <<'EOF'
# AGENTS.md

Plain ESM on Node 24, no dependencies.

- Test: `npm test`
- Test with coverage: `npm run test:coverage`, writes `coverage/lcov.info`
EOF
cat > .pharn/ci.yml <<'EOF'
# pharn-ci settings. The pharn-ci Action and `pharn-ci check` both read this file.
coverage:
  file: coverage/lcov.info
  threshold: 80
EOF
cat > .github/workflows/pharn-ci.yml <<'EOF'
name: pharn-ci
on:
  pull_request:

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
          persist-credentials: false
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24
      - run: npm ci
      - run: npm run test:coverage
      - id: pharn-ci
        uses: pharn-dev/pharn-ci@cb87afdc6e954a1efdad975e02c0a59a8573214d # v0.5.0
        timeout-minutes: 5
        with:
          test-integrity: warn
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
commit "ci: pharn-ci 0.5.0"
