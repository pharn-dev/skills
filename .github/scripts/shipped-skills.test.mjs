// The Skills CLI offers every SKILL.md it finds in this repository, so only the
// product skills under plugins/<plugin>/skills/<name>/ may be tracked (CORE-209).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..", "..");
const SHIPPED = /^plugins\/[^/]+\/skills\/([^/]+)\/SKILL\.md$/;

function trackedFiles(cwd) {
  return execFileSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8" }).split("\0").filter(Boolean);
}

// Skill names in the second column of the README "What's inside" table.
function readmeSkills(readme) {
  const section = readme.split(/^## What's inside$/m)[1].split(/^## /m)[0];
  return [...section.matchAll(/^\|[^|]*\|\s*`([^`]+)`\s*\|/gm)].map((match) => match[1]);
}

// Problems with the tracked paths: a SKILL.md outside plugins/<plugin>/skills/<name>/,
// or a skill name set that differs from the README's.
function skillProblems(paths, expected) {
  const problems = [];
  const names = [];
  for (const path of paths) {
    if (path !== "SKILL.md" && !path.endsWith("/SKILL.md")) continue;
    const match = SHIPPED.exec(path);
    if (match) names.push(match[1]);
    else problems.push(`SKILL.md outside plugins/<plugin>/skills/<name>/: ${path}`);
  }
  for (const name of names) if (!expected.includes(name)) problems.push(`skill not in README "What's inside": ${name}`);
  for (const name of expected) if (!names.includes(name)) problems.push(`README skill not tracked: ${name}`);
  return problems;
}

const expected = readmeSkills(readFileSync(join(root, "README.md"), "utf8"));

test("README names the 11 product skills", () => {
  assert.equal(expected.length, 11);
  assert.ok(expected.includes("pharn-cli"));
});

test("only the README's product skills are tracked, each under plugins/<plugin>/skills/<name>/", () => {
  assert.deepEqual(skillProblems(trackedFiles(root), expected), []);
});

test("a stray SKILL.md, a missing skill or an unlisted skill fails the check", (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "shipped-skills-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd, stdio: "ignore" });
  git("init", "--quiet");
  for (const path of ["plugins/pharn/skills/pharn-cli/SKILL.md", ".agents/skills/x/SKILL.md", "plugins/pharn/skills/extra/SKILL.md"]) {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), "---\nname: test\n---\n");
  }
  git("add", ".");
  assert.deepEqual(skillProblems(trackedFiles(cwd), ["pharn-cli", "pharn-ci-cover"]), [
    "SKILL.md outside plugins/<plugin>/skills/<name>/: .agents/skills/x/SKILL.md",
    `skill not in README "What's inside": extra`,
    "README skill not tracked: pharn-ci-cover",
  ]);
});
