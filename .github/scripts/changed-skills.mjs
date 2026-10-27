import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const skillFilePattern = /^plugins\/[^/]+\/skills\/([^/]+)\/SKILL\.md$/;

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function needsFullSync(path) {
  return (
    path === ".claude-plugin/marketplace.json" ||
    /^plugins\/[^/]+\/\.claude-plugin\/plugin\.json$/.test(path) ||
    path === "skills.sh.json" ||
    path === ".github/workflows/skills-sh.yml" ||
    path === ".github/scripts/changed-skills.mjs"
  );
}

export function changedSkills({ cwd = process.cwd(), before, head = "HEAD", all = false }) {
  // Resolve revisions before passing them to other Git commands.
  const after = git(cwd, ["rev-parse", "--verify", `${head}^{commit}`]).trim();
  const skillFiles = git(cwd, ["ls-tree", "-r", "--name-only", "-z", after, "--", "plugins"])
    .split("\0")
    .filter((path) => skillFilePattern.test(path));

  let changedPaths = [];
  if (!all && before && !/^0+$/.test(before)) {
    if (!/^[a-f0-9]{40}$/.test(before)) throw new Error("Invalid before commit SHA");
    try {
      git(cwd, ["cat-file", "-e", `${before}^{commit}`]);
    } catch {
      // A force push can make the previous tip unavailable to checkout.
      all = true;
    }
    if (!all) {
      changedPaths = git(cwd, ["diff", "--no-renames", "--name-only", "-z", before, after]).split("\0").filter(Boolean);
      all = changedPaths.some(needsFullSync);
    }
  } else {
    all = true;
  }

  const names = new Set();
  const selected = [];
  for (const path of skillFiles) {
    // Agent Skills requires the name to match its containing directory.
    const name = skillFilePattern.exec(path)[1];
    if (name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      throw new Error(`Invalid skill directory name: ${path}`);
    }
    if (names.has(name)) throw new Error(`Duplicate skill directory name: ${name}`);
    names.add(name);

    const directory = path.slice(0, -"SKILL.md".length);
    if (all || changedPaths.some((changedPath) => changedPath.startsWith(directory))) {
      selected.push(name);
    }
  }
  return selected.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const names = changedSkills({
    before: event.before,
    head: process.env.GITHUB_SHA,
    all: process.env.GITHUB_EVENT_NAME === "workflow_dispatch",
  });
  const json = JSON.stringify(names);
  console.log(json);
  appendFileSync(process.env.GITHUB_OUTPUT, `names=${json}\n`);
}
