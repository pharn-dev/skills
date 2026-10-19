#!/usr/bin/env bash
# Builds a small vitest project: vitest is a dev dependency, but the coverage
# provider @vitest/coverage-v8 is not, and nothing is installed (no
# node_modules, no network), so `vitest run --coverage` cannot run here.
# Everything is committed on main; there is no CI and no .pharn yet.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p src test
printf 'coverage/\nnode_modules/\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "pricing",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
EOF
cat > AGENTS.md <<'EOF'
# AGENTS.md

ESM on Node 24, tests on vitest.

- Install: `npm install`
- Test: `npm test`
EOF
cat > src/price.mjs <<'EOF'
export function withTax(net, rate) {
  if (!Number.isFinite(net) || net < 0) {
    throw new RangeError(`invalid net price: ${net}`);
  }
  return Math.round(net * (1 + rate) * 100) / 100;
}
EOF
cat > test/price.test.mjs <<'EOF'
import { describe, expect, it } from "vitest";
import { withTax } from "../src/price.mjs";

describe("withTax", () => {
  it("adds the tax rate to the net price", () => {
    expect(withTax(100, 0.23)).toBe(123);
  });
});
EOF
commit "feat: prices with tax"
