// Acceptance test for pharn-ci-fix-skill AC-8: README.md lists pharn-ci-fix, and CHANGELOG.md names pharn-ci-fix
// and pharn-ci 0.9.0 in its [Unreleased] section or, once released, its [pharn-ci 0.2.0] section. Both files are
// read inside the test body.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

// The CHANGELOG.md text under a heading that matches `heading`, up to the next `## [` heading ("" when absent).
function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => heading.test(l));
  if (start === -1) return "";
  const out = [];
  for (let i = start + 1; i < lines.length && !/^## \[/.test(lines[i]); i++) out.push(lines[i]);
  return out.join("\n");
}

test("AC-8: README.md lists pharn-ci-fix, and CHANGELOG.md's [Unreleased] or [pharn-ci 0.2.0] section names pharn-ci-fix and 0.9.0", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  assert.ok(readme.includes("pharn-ci-fix"), "README.md does not list pharn-ci-fix");
  const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
  const text = section(changelog, /^## \[Unreleased\]/) + "\n" + section(changelog, /^## \[pharn-ci 0\.2\.0\]/);
  assert.ok(text.includes("pharn-ci-fix"), "CHANGELOG.md [Unreleased] or [pharn-ci 0.2.0] does not name pharn-ci-fix");
  assert.match(text, /(?<![\d.])0\.9\.0(?![\d])/, "CHANGELOG.md [Unreleased] or [pharn-ci 0.2.0] does not name pharn-ci 0.9.0");
});
