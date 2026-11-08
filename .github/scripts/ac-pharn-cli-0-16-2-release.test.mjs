// Acceptance tests for pharn-cli-skill-0-16-2: the pharn plugin's version and CHANGELOG entry.
// AC-15 (pharn/features/pharn-cli-skill-0-16-2/SPEC.md).
// Every file is read inside a test body, so a missing file is a failed test, never a file that will not load.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

test("AC-15: the pharn plugin is at 0.5.0 and the Unreleased CHANGELOG entry names the 0.16.0 skill changes and the new evals", () => {
  const manifest = JSON.parse(read("plugins/pharn/.claude-plugin/plugin.json"));
  assert.equal(manifest.version, "0.5.0");

  const changelog = read("CHANGELOG.md");
  const start = changelog.search(/^## \[Unreleased\]/m);
  assert.ok(start >= 0, "CHANGELOG.md has an [Unreleased] section");
  const rest = changelog.slice(start + 1);
  const next = rest.search(/^## \[/m);
  const unreleased = (next >= 0 ? rest.slice(0, next) : rest).replace(/\s+/g, " ");
  for (const token of ["pharn-cli", "0.16.0", ".gitignore", "pharn uninstall", "gitignore-only-update", "uninstall-refused"]) {
    assert.ok(unreleased.includes(token), `the [Unreleased] section names ${token}`);
  }
});
