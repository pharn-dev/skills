import assert from "node:assert/strict";
import { test } from "node:test";
import { unpinnedActions } from "./check-action-pins.mjs";

const SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";

test("SHA-pinned and local actions pass; tags, branches and bare refs fail", () => {
  const workflow = [
    "steps:",
    `  - uses: actions/checkout@${SHA} # v7.0.1`,
    "  - uses: ./.github/actions/local",
    "  - uses: actions/setup-node@v4",
    "  - name: quoted",
    "    uses: 'org/action@main'",
    "  - uses: org/no-ref",
  ].join("\n");
  assert.deepEqual(unpinnedActions(workflow, "ci.yml"), [
    "ci.yml:4  actions/setup-node@v4",
    "ci.yml:6  org/action@main",
    "ci.yml:7  org/no-ref",
  ]);
});

test("uses: lines inside a block scalar are text, not steps", () => {
  const workflow = [
    "steps:",
    "  - run: |",
    "      cat > .github/workflows/x.yml <<'EOF'",
    "      - uses: actions/checkout@v4",
    "",
    "        uses: org/action@main",
    "      EOF",
    "  - uses: actions/setup-node@v4",
    "  - name: folded",
    "    run: >-",
    "      uses: org/other@v1",
  ].join("\n");
  assert.deepEqual(unpinnedActions(workflow, "ci.yml"), ["ci.yml:8  actions/setup-node@v4"]);
});
