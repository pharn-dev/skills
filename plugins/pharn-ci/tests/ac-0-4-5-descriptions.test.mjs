// Acceptance test for pharn-ci-plugin-0-4-5 AC-3: every pharn-ci skill's frontmatter description names pharn-ci 0.3.x
// and 0.4.x among the supported versions. Targets are read inside the test body.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SKILLS = fileURLToPath(new URL("../skills/", import.meta.url));

// The value of the frontmatter `description:` key: its own line plus any indented continuation lines (a folded or
// literal block, or a wrapped plain scalar), up to the next top-level key.
function frontmatterDescription(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  assert.ok(m, "SKILL.md has no frontmatter");
  const lines = m[1].split(/\r?\n/);
  const start = lines.findIndex((l) => /^description:/.test(l));
  assert.notEqual(start, -1, "frontmatter has no description");
  const parts = [lines[start].replace(/^description:\s*/, "")];
  for (let i = start + 1; i < lines.length && !/^[A-Za-z0-9_-]+:/.test(lines[i]); i++) parts.push(lines[i].trim());
  return parts.join(" ");
}

test("namesMinor reads single versions and ranges", () => {
  assert.ok(namesMinor("0.2.x to 0.9.x with Report v2", 4));
  assert.ok(namesMinor("0.1.x to 0.9.x", 3));
  assert.ok(namesMinor("0.2.x, 0.3.x or 0.4.x", 3));
  assert.ok(!namesMinor("0.2.x to 0.3.x", 4));
  assert.ok(!namesMinor("10.4.x", 4));
});

test("AC-3: every pharn-ci SKILL.md description names pharn-ci 0.3.x and 0.4.x", () => {
  const skills = readdirSync(SKILLS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  assert.deepEqual(skills, ["pharn-ci-cover", "pharn-ci-explain", "pharn-ci-fix", "pharn-ci-install", "pharn-ci-policy"]);
  // pharn-ci-fix is for pharn-ci 0.9.x only (fix objects exist since 0.9.0); the version check keeps to the four
  // skills written for 0.1.x to 0.4.x.
  for (const skill of ["pharn-ci-cover", "pharn-ci-explain", "pharn-ci-install", "pharn-ci-policy"]) {
    const description = frontmatterDescription(readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8"));
    for (const minor of [3, 4]) {
      assert.ok(namesMinor(description, minor), `${skill}'s description does not name 0.${minor}.x`);
    }
  }
});

// A description names 0.<minor>.x when it says so, or names a range `0.a.x to 0.b.x` that covers it (a <= minor <= b):
// pharn-ci-explain's "0.1.x to 0.9.x" covers 0.3.x and 0.4.x.
function namesMinor(description, minor) {
  if (new RegExp(`(?<![\\d.])0\\.${minor}\\.x\\b`).test(description)) return true;
  for (const m of description.matchAll(/(?<![\d.])0\.(\d+)\.x to 0\.(\d+)\.x\b/g)) {
    if (Number(m[1]) <= minor && minor <= Number(m[2])) return true;
  }
  return false;
}
