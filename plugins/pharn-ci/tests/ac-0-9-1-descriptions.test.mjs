// Acceptance test for pharn-ci-explain-policy-current AC-1: the pharn-ci-explain and pharn-ci-policy descriptions name
// the version range up to pharn-ci 0.9.x, and the policy description names the rules P01 to P14. Read inside the test.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SKILLS = fileURLToPath(new URL("../skills/", import.meta.url));

// The value of the frontmatter `description:` key: its own line plus any indented continuation lines.
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

test("AC-1: pharn-ci-explain names 0.1.x to 0.9.x, and pharn-ci-policy names a range ending at 0.9.x and P01 to P14", () => {
  const explain = frontmatterDescription(readFileSync(join(SKILLS, "pharn-ci-explain", "SKILL.md"), "utf8"));
  assert.ok(explain.includes("0.1.x to 0.9.x"), "pharn-ci-explain's description does not name 0.1.x to 0.9.x");

  const policy = frontmatterDescription(readFileSync(join(SKILLS, "pharn-ci-policy", "SKILL.md"), "utf8"));
  assert.match(policy, /(?<![\d.])0\.\d+\.x to 0\.9\.x\b/, "pharn-ci-policy's description does not name a range ending at 0.9.x");
  assert.ok(policy.includes("P01 to P14"), "pharn-ci-policy's description does not name P01 to P14");
});
