#!/usr/bin/env bash
# Builds a small Node project with tests on Node's own test runner and a
# test:coverage script that writes coverage/lcov.info, everything committed on
# main, no CI, no .github and no .pharn yet, and a private npm registry: .npmrc
# sets registry=https://npm.example.internal/ and package-lock.json records one
# dependency (left-pad) as resolved from that host. pharn-ci's dependency safety
# (D05) reports a lockfile entry from outside the npm and PyPI registries. No
# network: the dependency is only recorded in the lockfile, nothing imports it.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p src test
printf 'coverage/\nnode_modules/\n' > .gitignore
cat > .npmrc <<'EOF'
registry=https://npm.example.internal/
EOF
cat > package.json <<'EOF'
{
  "name": "cart",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "test:coverage": "mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info"
  },
  "dependencies": {
    "left-pad": "^1.3.0"
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
      "name": "cart",
      "dependencies": {
        "left-pad": "^1.3.0"
      }
    },
    "node_modules/left-pad": {
      "version": "1.3.0",
      "resolved": "https://npm.example.internal/left-pad/-/left-pad-1.3.0.tgz",
      "integrity": "sha512-XI5MPzVNApjAyhQzphX8BkmKsKUxD4LdyK24iZeQGinBN9yTQT3bFlCBy/aVx2HrNcqQGsdot8ghrjyrvMCoEA=="
    }
  }
}
EOF
cat > AGENTS.md <<'EOF'
# AGENTS.md

Plain ESM on Node 24. Packages come from the private registry in `.npmrc`.

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
