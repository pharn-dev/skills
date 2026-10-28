// Acceptance test for pharn-ci-plugin-0-4-5 AC-13: the four new eval cases exist in the style of plugins/pharn-ci/evals,
// and the agent-config-secret case has a not_contains regex grader that matches the value its scaffold plants while
// the grader's own text does not hold that value. The case directories are read, and the scaffold run, inside the test.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const EVALS = fileURLToPath(new URL("../evals/", import.meta.url));
const CASES = ["explain-policy-p02", "explain-policy-pressure", "explain-agent-config-secret", "policy-org-draft"];

// Files an agent tool reads as its configuration (settings, MCP servers, instructions).
const AGENT_CONFIG =
  /(?:^|\/)(?:\.mcp\.json|mcp\.json|\.claude\/.+|\.cursor\/.+|\.vscode\/mcp\.json|CLAUDE(?:\.local)?\.md|AGENTS\.md|GEMINI\.md|\.codex\/.+|\.gemini\/.+|\.windsurf.*|\.clinerules.*|\.github\/copilot-instructions\.md|\.amazonq\/.+|\.continue\/.+|\.roo.*|\.kiro\/.+|\.junie\/.+|opencode\.json|\.aider.*|\.goosehints|\.zed\/.+)$/;

// The scalar value of `key:` in a grader's frontmatter: single-quoted, double-quoted or plain.
function frontmatterValue(fm, key) {
  const m = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(fm);
  if (!m) return undefined;
  const raw = m[1].trim();
  if (raw.startsWith("'")) return raw.slice(1, raw.lastIndexOf("'")).replace(/''/g, "'");
  if (raw.startsWith('"')) return JSON.parse(raw.slice(0, raw.lastIndexOf('"') + 1));
  return raw.replace(/\s+#.*$/, "");
}

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git") continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, root, out);
    else if (st.isFile()) out.push(relative(root, abs).split("\\").join("/"));
  }
  return out;
}

// Every agent config the scaffold leaves: in the working tree and at the tip of every local branch.
function agentConfigs(dir) {
  const contents = [];
  for (const rel of walk(dir)) if (AGENT_CONFIG.test(rel)) contents.push(readFileSync(join(dir, rel), "utf8"));
  const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const refs = git("for-each-ref", "--format=%(refname)", "refs/heads");
  for (const ref of (refs.stdout ?? "").split("\n").filter(Boolean)) {
    const files = git("ls-tree", "-r", "--name-only", ref);
    for (const rel of (files.stdout ?? "").split("\n").filter(Boolean)) {
      if (!AGENT_CONFIG.test(rel)) continue;
      const shown = git("show", `${ref}:${rel}`);
      if (shown.status === 0) contents.push(shown.stdout);
    }
  }
  return contents;
}

test("AC-13: four new eval cases, and an AGENT_CONFIG_SECRET grader that fails on the planted secret without holding it", () => {
  for (const c of CASES) {
    const dir = join(EVALS, c);
    for (const f of ["case.yaml", "prompt.md", "scaffold.sh"]) assert.ok(existsSync(join(dir, f)), `${c}/${f} does not exist`);
    const graders = existsSync(join(dir, "graders")) ? readdirSync(join(dir, "graders")).filter((f) => f.endsWith(".md")) : [];
    assert.ok(graders.length > 0, `${c} has no graders/*.md`);
  }

  const caseDir = join(EVALS, "explain-agent-config-secret");
  const graderText = readFileSync(join(caseDir, "graders/no-secret.md"), "utf8");
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(graderText);
  assert.ok(fm, "no-secret.md has no frontmatter");
  assert.equal(frontmatterValue(fm[1], "type"), "regex");
  assert.equal(frontmatterValue(fm[1], "match"), "not_contains");
  let source = frontmatterValue(fm[1], "pattern");
  assert.ok(source, "no-secret.md has no pattern");
  let flags = frontmatterValue(fm[1], "flags") ?? "";
  if (source.startsWith("(?i)")) {
    source = source.slice(4);
    flags += "i";
  }
  const pattern = new RegExp(source, flags.replace(/[^imsu]/g, ""));

  const work = mkdtempSync(join(tmpdir(), "ac-0-4-5-secret-"));
  try {
    const r = spawnSync("bash", [join(caseDir, "scaffold.sh")], {
      cwd: work,
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
    });
    assert.equal(r.status, 0, `scaffold.sh failed:\n${r.stderr}`);
    const configs = agentConfigs(work);
    assert.ok(configs.length > 0, "the scaffold writes no agent config");
    const planted = configs.map((t) => pattern.exec(t)?.[0]).find((v) => v !== undefined && v.length > 0);
    assert.ok(planted, "the no-secret pattern matches no value in the agent configs the scaffold writes");
    assert.ok(!graderText.includes(planted), "no-secret.md holds the planted secret value verbatim");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
