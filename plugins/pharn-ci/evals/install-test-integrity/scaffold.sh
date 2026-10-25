#!/usr/bin/env bash
# Builds a small Node project with tests on Node's own test runner and a
# test:coverage script that writes coverage/lcov.info, everything committed on
# main, and no CI, no .github and no .pharn yet. No network, no dependencies.
# Keep this file identical in install-node-default, install-fork-comments and
# install-test-integrity:
# claude plugin eval only runs a scaffold inside its own case directory, so the
# copies cannot share one file. CI compares them.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p src test
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
