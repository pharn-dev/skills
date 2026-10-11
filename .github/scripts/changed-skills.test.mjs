import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { changedSkills } from "./changed-skills.mjs";

function repository(t) {
  const cwd = mkdtempSync(join(tmpdir(), "changed-skills-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "--quiet");
  git("config", "user.name", "Workflow test");
  git("config", "user.email", "workflow-test@example.invalid");
  git("config", "commit.gpgsign", "false");
  const write = (path, content = "test\n") => {
    const target = join(cwd, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  const skill = (name, plugin = "argus") =>
    write(
      `plugins/${plugin}/skills/${name}/SKILL.md`,
      `---\nname: ${name}\ndescription: Test skill\n---\n`,
    );
  const commit = () => {
    git("add", ".");
    git("commit", "--quiet", "--message", "Test change");
    return git("rev-parse", "HEAD");
  };
  skill("argus-setup");
  skill("argus-memory");
  skill("pharn-cli", "pharn");
  const before = commit();
  return { cwd, git, write, skill, commit, before };
}

test("selects changed definitions, support files, and new skills across a whole push", (t) => {
  const repo = repository(t);
  repo.write(
    "plugins/argus/skills/argus-setup/SKILL.md",
    "Changed definition\n",
  );
  repo.commit();
  repo.write("plugins/argus/skills/argus-memory/references/memory.md");
  repo.write("plugins/argus/skills/argus-memory/scripts/argus.mjs");
  repo.skill("argus-new");
  repo.commit();
  assert.deepEqual(changedSkills(repo), [
    "argus-memory",
    "argus-new",
    "argus-setup",
  ]);
});

test("unrelated docs and eval changes do not select skills", (t) => {
  const repo = repository(t);
  repo.write("README.md");
  repo.write("plugins/argus/evals/example/scaffold.sh");
  repo.commit();
  assert.deepEqual(changedSkills(repo), []);
});

test("deleted skills are skipped, but removed support files select their skill", (t) => {
  const repo = repository(t);
  repo.write("plugins/argus/skills/argus-memory/references/old.md");
  repo.before = repo.commit();
  repo.git("rm", "-r", "plugins/argus/skills/argus-setup");
  repo.git("rm", "plugins/argus/skills/argus-memory/references/old.md");
  repo.commit();
  assert.deepEqual(changedSkills(repo), ["argus-memory"]);
});

test("a rename selects the surviving new skill name", (t) => {
  const repo = repository(t);
  repo.git(
    "mv",
    "plugins/argus/skills/argus-setup",
    "plugins/argus/skills/argus-renamed",
  );
  repo.write(
    "plugins/argus/skills/argus-renamed/SKILL.md",
    "---\nname: argus-renamed\ndescription: Renamed\n---\n",
  );
  repo.commit();
  assert.deepEqual(changedSkills(repo), ["argus-renamed"]);
});

test("manual runs, first pushes, and unavailable previous tips select all skills", (t) => {
  const repo = repository(t);
  const expected = ["argus-memory", "argus-setup", "pharn-cli"];
  assert.deepEqual(changedSkills({ ...repo, all: true }), expected);
  assert.deepEqual(
    changedSkills({ ...repo, before: "0".repeat(40) }),
    expected,
  );
  assert.deepEqual(
    changedSkills({ ...repo, before: "f".repeat(40) }),
    expected,
  );
});

for (const path of [
  ".claude-plugin/marketplace.json",
  "plugins/argus/.claude-plugin/plugin.json",
  "skills.sh.json",
  ".github/workflows/skills-sh.yml",
  ".github/scripts/changed-skills.mjs",
]) {
  test(`${path} changes select all skills`, (t) => {
    const repo = repository(t);
    repo.write(path);
    repo.commit();
    assert.deepEqual(changedSkills(repo), [
      "argus-memory",
      "argus-setup",
      "pharn-cli",
    ]);
  });
}

test("uses the event commit even when the checkout tip has advanced", (t) => {
  const repo = repository(t);
  repo.write("plugins/pharn/skills/pharn-cli/references/commands.md");
  const head = repo.commit();
  repo.skill("argus-later");
  repo.commit();
  assert.deepEqual(changedSkills({ ...repo, head }), ["pharn-cli"]);
});

test("rejects ambiguous names across plugins", (t) => {
  const repo = repository(t);
  repo.skill("argus-setup", "other");
  repo.commit();
  assert.throws(() => changedSkills(repo), /Duplicate skill directory name/);
});
