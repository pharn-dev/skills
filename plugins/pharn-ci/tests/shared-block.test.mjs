// The two helpers carry one block of coverage-reading code each, ported from pharn-ci. A skill directory is
// installed on its own, so they cannot import it from each other; this keeps the copies identical.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const START = "// <shared:coverage>";
const END = "// </shared:coverage>";

function block(rel) {
  const text = readFileSync(new URL(rel, import.meta.url), "utf8");
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  assert.ok(start !== -1 && end > start, `${rel} has no shared:coverage block`);
  assert.equal(text.indexOf(START, start + 1), -1, `${rel} has more than one shared:coverage block`);
  return text.slice(start, end + END.length);
}

test("check-lines.mjs and check-coverage.mjs carry the same shared:coverage block", () => {
  assert.equal(
    block("../skills/pharn-ci-install/scripts/check-coverage.mjs"),
    block("../skills/pharn-ci-cover/scripts/check-lines.mjs"),
    "copy the block from one helper to the other",
  );
});
