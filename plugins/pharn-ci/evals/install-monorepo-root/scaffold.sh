#!/usr/bin/env bash
# Builds a monorepo whose only tested package, packages/core, runs its own
# test:coverage script and writes lcov paths relative to itself
# (SF:src/slug.mjs) to packages/core/coverage/lcov.info. Everything is committed
# on main; there is no CI and no .pharn yet. No network, no dependencies.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p packages/core/src packages/core/test
printf 'coverage/\nnode_modules/\n' > .gitignore
cat > packages/core/package.json <<'EOF'
{
  "name": "@acme/core",
  "private": true,
  "type": "module",
  "scripts": {
    "test:coverage": "mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info"
  }
}
EOF
cat > AGENTS.md <<'EOF'
# AGENTS.md

A monorepo of plain ESM packages on Node 24, no dependencies. Only
`packages/core` has tests so far.

- Test with coverage: `npm run test:coverage` in `packages/core`, writes
  `packages/core/coverage/lcov.info`
EOF
cat > packages/core/src/slug.mjs <<'EOF'
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
EOF
cat > packages/core/test/slug.test.mjs <<'EOF'
import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify } from "../src/slug.mjs";

test("slugify lowercases and joins words with dashes", () => {
  assert.equal(slugify("  Hello, World  "), "hello-world");
});
EOF
commit "feat: slugify"
