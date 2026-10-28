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

test("AC-3: every pharn-ci SKILL.md description names pharn-ci 0.3.x and 0.4.x", () => {
  const skills = readdirSync(SKILLS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  assert.deepEqual(skills, ["pharn-ci-cover", "pharn-ci-explain", "pharn-ci-install", "pharn-ci-policy"]);
  for (const skill of skills) {
    const description = frontmatterDescription(readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8"));
    assert.match(description, /(?<![\d.])0\.3\.x\b/, `${skill}'s description does not name 0.3.x`);
    assert.match(description, /(?<![\d.])0\.4\.x\b/, `${skill}'s description does not name 0.4.x`);
  }
});
