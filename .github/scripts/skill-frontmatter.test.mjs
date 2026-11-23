// Every shipped skill's frontmatter fits the Agent Skills spec: `name` matches its directory, is at most 64
// characters and is lowercase words joined by hyphens; `description` is one line of 1 to 1024 characters; and
// `compatibility`, when present, is at most 500. The frontmatter is read by hand, so the root package needs no
// YAML dependency, and a description that spans lines (a block scalar or a wrapped value) fails.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The problems with one SKILL.md, as sentences; an empty list means it passes.
function frontmatterProblems(path, text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!m) return ["has no frontmatter"];
  const lines = m[1].split(/\r?\n/);
  const problems = [];

  // The value of a top-level key, or null when absent; a value continued on the next line is reported.
  const value = (key) => {
    const i = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (i === -1) return null;
    const raw = lines[i].slice(key.length + 1).trim();
    if (/^[|>]/.test(raw) || (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]))) {
      problems.push(`${key} spans lines`);
    }
    const quoted = /^(["'])(.*)\1$/.exec(raw);
    if (!quoted && /: | #/.test(raw)) problems.push(`${key} is not a valid plain YAML scalar (": " or " #")`);
    return quoted ? quoted[2] : raw;
  };

  const name = value("name");
  const directory = basename(dirname(path));
  if (name === null) problems.push("has no name");
  else {
    if (name !== directory) problems.push(`name "${name}" differs from its directory "${directory}"`);
    if ([...name].length > 64) problems.push("name is longer than 64 characters");
    if (!NAME_RE.test(name)) problems.push(`name "${name}" does not match ${NAME_RE}`);
  }

  const description = value("description");
  if (description === null || description.length === 0) problems.push("has no description");
  else if ([...description].length > 1024) problems.push(`description is ${[...description].length} characters (max 1024)`);

  const compatibility = value("compatibility");
  if (compatibility !== null && [...compatibility].length > 500) {
    problems.push(`compatibility is ${[...compatibility].length} characters (max 500)`);
  }
  return problems;
}

const skill = (name, description, extra = "") => `---\nname: ${name}\ndescription: ${description}\n${extra}---\n\n# ${name}\n`;

test("every shipped SKILL.md has a valid name, description and compatibility", () => {
  const paths = execFileSync("git", ["ls-files", "plugins/*/skills/*/SKILL.md"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  assert.ok(paths.length > 0, "git ls-files found no shipped skills");
  for (const path of paths) {
    assert.deepEqual(frontmatterProblems(path, readFileSync(join(ROOT, path), "utf8")), [], path);
  }
});

test("a 1024-character description passes and a 1025-character one fails", () => {
  const path = "plugins/p/skills/a-skill/SKILL.md";
  assert.deepEqual(frontmatterProblems(path, skill("a-skill", "x".repeat(1024))), []);
  assert.deepEqual(frontmatterProblems(path, skill("a-skill", "x".repeat(1025))), ["description is 1025 characters (max 1024)"]);
});

test("a name that differs from its directory fails", () => {
  assert.deepEqual(frontmatterProblems("plugins/p/skills/a-skill/SKILL.md", skill("other-skill", "Does a thing.")), [
    'name "other-skill" differs from its directory "a-skill"',
  ]);
});

test("a malformed name, a multi-line or empty description and a long compatibility fail", () => {
  const at = (dir) => `plugins/p/skills/${dir}/SKILL.md`;
  assert.ok(frontmatterProblems(at("Bad_Name"), skill("Bad_Name", "Does a thing.")).some((p) => p.includes("does not match")));
  assert.ok(frontmatterProblems(at("a".repeat(65)), skill("a".repeat(65), "Does a thing.")).includes("name is longer than 64 characters"));
  assert.ok(frontmatterProblems(at("a-skill"), skill("a-skill", ">\n  Does a thing.")).includes("description spans lines"));
  assert.ok(frontmatterProblems(at("a-skill"), skill("a-skill", "Does a\n  thing.")).includes("description spans lines"));
  assert.ok(frontmatterProblems(at("a-skill"), skill("a-skill", "")).includes("has no description"));
  assert.ok(frontmatterProblems(at("a-skill"), skill("a-skill", "Does this: a thing.")).some((p) => p.includes("plain YAML")));
  assert.deepEqual(frontmatterProblems(at("a-skill"), skill("a-skill", "Does a thing.", `compatibility: ${"c".repeat(500)}\n`)), []);
  assert.deepEqual(frontmatterProblems(at("a-skill"), skill("a-skill", "Does a thing.", `compatibility: ${"c".repeat(501)}\n`)), [
    "compatibility is 501 characters (max 500)",
  ]);
});
