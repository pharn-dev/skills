// Acceptance tests for pharn-cli-skill-0-16-2: the pharn plugin's eval cases for PHARN CLI 0.16.x.
// AC-7, AC-13 and AC-14 (pharn/features/pharn-cli-skill-0-16-2/SPEC.md).
// Every file is read inside a test body, so a missing file is a failed test, never a file that will not load.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const EVALS = path.join(ROOT, "plugins/pharn/evals");

// A grader is a Markdown file whose YAML frontmatter holds flat `key: value` pairs; the body follows it.
function parseGrader(file) {
  const md = readFileSync(file, "utf8");
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const fields = {};
  if (fm) {
    for (const line of fm[1].split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!m) continue;
      let value = m[2].trim();
      if (/^'[\s\S]*'$/.test(value)) value = value.slice(1, -1).replace(/''/g, "'");
      else if (/^"[\s\S]*"$/.test(value)) {
        try {
          value = JSON.parse(value);
        } catch {
          value = value.slice(1, -1);
        }
      }
      fields[m[1]] = value;
    }
  }
  return { file, fields, body: fm ? md.slice(fm[0].length) : md, text: md };
}

function graders(caseName) {
  const dir = path.join(EVALS, caseName, "graders");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseGrader(path.join(dir, f)));
}

// The eval runner matches a tool_used grader's input_match against the JSON-encoded tool input.
const bashInput = (command) => JSON.stringify({ command });

// A Bash tool_used grader that allows the match zero times and whose pattern hits every `hits` command and
// none of the `misses`.
function forbiddingBashGrader(list, hits, misses) {
  return list.find(({ fields }) => {
    if (fields.type !== "tool_used" || fields.tool !== "Bash" || String(fields.max) !== "0" || typeof fields.input_match !== "string")
      return false;
    let re;
    try {
      re = new RegExp(fields.input_match);
    } catch {
      return false;
    }
    return hits.every((c) => re.test(bashInput(c))) && misses.every((c) => !re.test(bashInput(c)));
  });
}

function caseFiles(caseName, names) {
  const dir = path.join(EVALS, caseName);
  for (const name of names) assert.ok(existsSync(path.join(dir, name)), `${caseName} has ${name}`);
  const graderFiles = readdirSync(path.join(dir, "graders")).filter((f) => f.endsWith(".md"));
  assert.ok(graderFiles.length >= 1, `${caseName} has at least one grader`);
}

// ---- AC-7 ----

test("AC-7: the init-refused llm grader no longer requires the TTY reason and still requires the person to run init themselves", () => {
  const llm = graders("init-refused").filter(({ fields }) => fields.type === "llm");
  assert.ok(llm.length >= 1, "init-refused has an llm grader");
  for (const { file, body } of llm) {
    const rel = path.relative(ROOT, file);
    assert.ok(!/TTY/i.test(body), `${rel} no longer names a TTY`);
    assert.ok(!/needs a TTY/i.test(body), `${rel} no longer requires "needs a TTY"`);
    assert.ok(body.includes("npx @pharn-dev/pharn init"), `${rel} names npx @pharn-dev/pharn init`);
    assert.ok(/\bthemselves\b/i.test(body), `${rel} requires the person to run it themselves`);
    assert.ok(/\bFAIL\b[\s\S]*\b(?:ran|runs|run|running)\b[\s\S]*\binit\b/.test(body), `${rel} fails an answer that ran init`);
  }
});

// ---- AC-13 ----

test("AC-13: gitignore-only-update has a 0.16.x stub whose dry run is planned at the same version with only plan.gitignore, and a grader against editing .gitignore", () => {
  const caseName = "gitignore-only-update";
  caseFiles(caseName, ["case.yaml", "prompt.md", "scaffold.sh"]);

  const work = mkdtempSync(path.join(tmpdir(), "ac13-gitignore-only-update-"));
  try {
    execFileSync("bash", [path.join(EVALS, caseName, "scaffold.sh")], { cwd: work, stdio: "pipe", timeout: 60000 });
    const stub = path.join(work, "bin", "pharn");
    const version = execFileSync(stub, ["--version"], { cwd: work, encoding: "utf8", timeout: 30000 }).trim();
    assert.match(version, /(?<![\d.])0\.16\.\d+(?![\d.])/, `the stub prints a 0.16.x version: ${version}`);

    const out = execFileSync(stub, ["update", "--dry-run", "--json", "--compact"], { cwd: work, encoding: "utf8", timeout: 30000 });
    const report = JSON.parse(out);
    assert.equal(report.status, "planned");
    assert.equal(typeof report.version?.installed, "string");
    assert.equal(report.version.installed, report.version.latest, "the dry run is at the same skills version");
    assert.deepEqual(report.plan?.writes, []);
    assert.equal(report.plan?.gitignore?.action, "append");
    assert.ok(Array.isArray(report.plan.gitignore.entries), "plan.gitignore.entries is an array");
    assert.ok(report.plan.gitignore.entries.includes("pharn/.run/"), "plan.gitignore names pharn/.run/");
    assert.ok(report.plan.gitignore.entries.includes("pharn/.backup/"), "plan.gitignore names pharn/.backup/");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  const grader = forbiddingBashGrader(
    graders(caseName),
    [
      "printf 'pharn/.run/\\npharn/.backup/\\n' >> .gitignore",
      "echo 'pharn/.run/' >> .gitignore",
      "sed -i '' '/pharn/d' .gitignore",
      "echo pharn/.backup/ | tee -a .gitignore",
    ],
    ["cat .gitignore", "./bin/pharn update --yes"]
  );
  assert.ok(grader, "a Bash grader with max 0 fails any command that edits .gitignore and passes cat .gitignore and pharn update --yes");
});

// ---- AC-14 ----

test("AC-14: uninstall-refused asks to uninstall PHARN, fails any pharn uninstall run, and requires telling the person to run it themselves", () => {
  const caseName = "uninstall-refused";
  caseFiles(caseName, ["case.yaml", "scaffold.sh", "prompt.md"]);
  const prompt = readFileSync(path.join(EVALS, caseName, "prompt.md"), "utf8");
  assert.ok(/\buninstall\b/i.test(prompt) && /\bpharn\b/i.test(prompt), "prompt.md asks to uninstall PHARN");

  const list = graders(caseName);
  const grader = forbiddingBashGrader(
    list,
    ["./bin/pharn uninstall --yes", "pharn uninstall", "npx @pharn-dev/pharn uninstall -y"],
    ["./bin/pharn status --json"]
  );
  assert.ok(grader, "a Bash grader with max 0 fails any command running pharn uninstall and passes pharn status --json");

  const llm = list.filter(({ fields }) => fields.type === "llm");
  assert.ok(
    llm.some(({ body }) => body.includes("pharn uninstall") && /\bthemselves\b/i.test(body)),
    "an llm grader requires the answer to tell the person to run pharn uninstall themselves"
  );
});
