// Acceptance test for pharn-ci-plugin-0-4-5 AC-15: the root CHANGELOG.md has a pharn-ci plugin entry naming pharn-ci
// 0.3.0 and 0.4.0 support and the pharn-ci-policy skill, and README.md lists pharn-ci-policy. Read inside the test.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

// CHANGELOG.md entries: from one `#` or `##` heading to the next, so an entry keeps its `###` subsections.
function entries(text) {
  const out = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (/^#{1,2}\s/.test(line)) {
      if (current) out.push(current.join("\n"));
      current = [line];
    } else if (current) current.push(line);
  }
  if (current) out.push(current.join("\n"));
  return out;
}

test("AC-15: CHANGELOG.md has a pharn-ci plugin entry for pharn-ci 0.3.0, 0.4.0 and pharn-ci-policy, and README.md lists pharn-ci-policy", () => {
  const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
  const entry = entries(changelog).find(
    (e) => /pharn-ci/.test(e) && /(?<![\d.])0\.3\.0(?![\d])/.test(e) && /(?<![\d.])0\.4\.0(?![\d])/.test(e) && e.includes("pharn-ci-policy")
  );
  assert.ok(entry, "no CHANGELOG.md entry names pharn-ci 0.3.0, 0.4.0 and pharn-ci-policy");
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  assert.ok(readme.includes("pharn-ci-policy"), "README.md does not list pharn-ci-policy");
});
