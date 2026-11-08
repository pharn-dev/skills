// Acceptance test for pharn-ci-fix-skill AC-8: README.md lists pharn-ci-fix, and the [Unreleased] section of
// CHANGELOG.md names pharn-ci-fix and pharn-ci 0.9.0. Both files are read inside the test body.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

// The CHANGELOG.md text from `## [Unreleased]` up to the next `## [` heading.
function unreleased(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^## \[Unreleased\]/.test(l));
  assert.notEqual(start, -1, "CHANGELOG.md has no ## [Unreleased] section");
  const out = [];
  for (let i = start + 1; i < lines.length && !/^## \[/.test(lines[i]); i++) out.push(lines[i]);
  return out.join("\n");
}

test("AC-8: README.md lists pharn-ci-fix, and CHANGELOG.md's [Unreleased] section names pharn-ci-fix and 0.9.0", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  assert.ok(readme.includes("pharn-ci-fix"), "README.md does not list pharn-ci-fix");
  const section = unreleased(readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"));
  assert.ok(section.includes("pharn-ci-fix"), "CHANGELOG.md [Unreleased] does not name pharn-ci-fix");
  assert.match(section, /(?<![\d.])0\.9\.0(?![\d])/, "CHANGELOG.md [Unreleased] does not name pharn-ci 0.9.0");
});
