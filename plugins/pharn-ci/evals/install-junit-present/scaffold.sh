#!/usr/bin/env bash
# Builds a small Node project with tests on Node's own test runner whose
# test:coverage script writes both coverage/lcov.info and a JUnit report,
# junit.xml (the junit reporter), everything committed on main, no CI, no
# .github and no .pharn yet. The repository already produces JUnit output, so
# pharn-ci's junit-paths input applies. No network, no dependencies.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p src test
printf 'coverage/\nnode_modules/\njunit.xml\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "cart",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "test:coverage": "mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info --test-reporter=junit --test-reporter-destination=junit.xml"
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
- Test with coverage: `npm run test:coverage`, writes `coverage/lcov.info` and the JUnit report `junit.xml`
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
