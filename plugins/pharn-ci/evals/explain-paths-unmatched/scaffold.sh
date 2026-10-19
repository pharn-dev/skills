#!/usr/bin/env bash
# Builds a monorepo whose package packages/core writes lcov paths relative to
# itself (SF:src/slug.mjs), while the workflow reads the report from the repo
# root with a threshold of 80 and no coverage-root. packages/core/coverage/lcov.info
# and report.json are what the package's test run and
# `pharn-ci check --base main --coverage packages/core/coverage/lcov.info --threshold 80 --format json`
# 0.1.0 wrote for this exact tree, as CI would have. No network.
set -eu
git init -q -b main .
commit() { git add -A && git -c user.name=dev -c user.email=dev@example.com commit -qm "$1"; }
mkdir -p packages/core/src packages/core/test .github/workflows
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
cat > AGENTS.md <<'EOF'
# AGENTS.md

Monorepo of plain ESM packages on Node 24. Each package tests itself:
`npm run test:coverage` inside `packages/<name>` writes `packages/<name>/coverage/lcov.info`.
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
      - name: Test core with coverage
        working-directory: packages/core
        run: npm run test:coverage
      - uses: pharn-dev/pharn-ci@v0.1.0
        timeout-minutes: 5
        with:
          coverage-file: packages/core/coverage/lcov.info
          threshold: 80
EOF
commit "feat: slugify"
git checkout -q -b feature/truncate
cat > packages/core/src/truncate.mjs <<'EOF'
export function truncate(text, max) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}
EOF
cat >> packages/core/test/slug.test.mjs <<'EOF'

import { truncate } from "../src/truncate.mjs";

test("truncate cuts long text and adds an ellipsis", () => {
  assert.equal(truncate("abcdef", 4), "abc…");
});
EOF
commit "feat: truncate"
mkdir -p packages/core/coverage
cat > packages/core/coverage/lcov.info <<'EOF'
TN:
SF:src/slug.mjs
FN:1,slugify
FNDA:1,slugify
FNF:1
FNH:1
BRDA:1,0,0,1
BRDA:1,1,0,1
BRF:2
BRH:2
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,1
DA:6,1
DA:7,1
LH:7
LF:7
end_of_record
SF:src/truncate.mjs
FN:1,truncate
FNDA:1,truncate
FNF:1
FNH:1
BRDA:1,0,0,1
BRDA:1,1,0,1
BRDA:2,2,0,0
BRF:3
BRH:2
DA:1,1
DA:2,1
DA:3,0
DA:4,0
DA:5,1
DA:6,1
LH:4
LF:6
end_of_record
EOF
cat > report.json <<'EOF'
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
      "code": "COVERAGE_PATHS_UNMATCHED",
      "text": "None of the 2 file paths in the coverage report are tracked files in the repository (for example `src/slug.mjs`), so diff coverage was not measured. The paths look relative to `packages/core`: set coverage-root: `packages/core` (coverage.root in .pharn/ci.yml, --coverage-root in the CLI)."
    }
  ]
}
EOF
