// The helpers carry shared code ported or written once: a skill directory is installed on its own, so they cannot
// import it from each other. This keeps the copies identical: the coverage-reading block in the two coverage
// helpers, and the file-reading routine in all four.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const CHECK_LINES = "../skills/pharn-ci-cover/scripts/check-lines.mjs";
const CHECK_COVERAGE = "../skills/pharn-ci-install/scripts/check-coverage.mjs";
const CHECK_POLICY = "../skills/pharn-ci-policy/scripts/check-policy.mjs";
const LIST_FIXES = "../skills/pharn-ci-fix/scripts/list-fixes.mjs";

function block(rel, name) {
  const START = `// <shared:${name}>`;
  const END = `// </shared:${name}>`;
  const text = readFileSync(new URL(rel, import.meta.url), "utf8");
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  assert.ok(start !== -1 && end > start, `${rel} has no shared:${name} block`);
  assert.equal(text.indexOf(START, start + 1), -1, `${rel} has more than one shared:${name} block`);
  return text.slice(start, end + END.length);
}

test("check-lines.mjs and check-coverage.mjs carry the same shared:coverage block", () => {
  assert.equal(block(CHECK_COVERAGE, "coverage"), block(CHECK_LINES, "coverage"), "copy the block from one helper to the other");
});

test("the four helpers carry the same shared:read-file routine, inside shared:coverage where there is one", () => {
  const routine = block(CHECK_LINES, "read-file");
  for (const rel of [CHECK_COVERAGE, CHECK_POLICY, LIST_FIXES]) {
    assert.equal(block(rel, "read-file"), routine, `copy the routine from check-lines.mjs to ${rel}`);
  }
  assert.ok(block(CHECK_LINES, "coverage").includes(routine), "the routine sits inside the shared:coverage block");
});
