import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The reporter flags are the tokens of the `test` script between `node --test` and its first glob,
// so this test runs the same wiring `npm test` does.
function reporterFlags() {
  const { scripts } = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const tokens = scripts.test.split(/\s+/);
  assert.deepEqual(tokens.slice(0, 2), ["node", "--test"]);
  const flags = [];
  for (const token of tokens.slice(2)) {
    if (!token.startsWith("--")) break;
    flags.push(token.startsWith("--test-reporter=./") ? resolveReporter(token) : token);
  }
  return flags;
}

function resolveReporter(token) {
  const value = token.slice("--test-reporter=".length);
  return `--test-reporter=${path.join(repoRoot, value)}`;
}

const workdirs = [];
after(() => {
  for (const dir of workdirs) rmSync(dir, { recursive: true, force: true });
});

function workdir(fixtures) {
  const dir = mkdtempSync(path.join(tmpdir(), "pharn-reporter-"));
  workdirs.push(dir);
  for (const [name, source] of Object.entries(fixtures)) writeFileSync(path.join(dir, name), source);
  return dir;
}

// One place builds the child's env: the nested `node --test` must not report into this run
// (NODE_TEST_CONTEXT) nor overwrite this run's results file (PHARN_TEST_RESULTS).
function childEnv(results) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.PHARN_TEST_RESULTS;
  if (results !== undefined) env.PHARN_TEST_RESULTS = results;
  return env;
}

function run(dir, files, { results } = {}) {
  const child = spawnSync(process.execPath, ["--test", ...reporterFlags(), ...files], {
    cwd: dir,
    env: childEnv(results),
    encoding: "utf8",
  });
  assert.equal(child.error, undefined);
  return child;
}

function readResults(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

const MIXED = `
import { describe, test } from "node:test";
import assert from "node:assert/strict";
describe("outer", () => {
  test("passes", () => {});
  test("fails", () => { assert.equal(1, 2); });
  test("skipped", { skip: true }, () => {});
  test("todo", { todo: true }, () => {});
});
test("top", async (t) => { await t.test("sub", () => {}); });
`;

const PASSING = `
import { test } from "node:test";
test("passes", () => {});
`;

describe("pharn-test-reporter", () => {
  test("writes the pharn-json document with exact keys, paths, files and statuses", () => {
    const dir = workdir({ "mixed.test.mjs": MIXED });
    const results = path.join(dir, "results.json");
    run(dir, ["mixed.test.mjs"], { results });

    const doc = readResults(results);
    assert.deepEqual(Object.keys(doc).sort(), ["schema", "suite_errors", "tests"]);
    assert.equal(doc.schema, "pharn-test-results/1");
    assert.equal(doc.suite_errors, 0);
    for (const entry of doc.tests) {
      assert.deepEqual(Object.keys(entry).sort(), ["file", "path", "status"]);
      assert.equal(entry.file, "mixed.test.mjs");
    }

    const byPath = new Map(doc.tests.map((entry) => [entry.path.join(" > "), entry.status]));
    assert.equal(byPath.size, doc.tests.length, "each test appears once");
    assert.equal(byPath.get("outer > passes"), "passed");
    assert.equal(byPath.get("outer > fails"), "failed");
    assert.equal(byPath.get("outer > skipped"), "skipped");
    assert.equal(byPath.get("outer > todo"), "skipped");
    assert.equal(byPath.get("top > sub"), "passed");
    assert.equal(byPath.has("outer"), false, "a describe is never an entry");
  });

  test("an import error counts as a suite error and is not a test entry", () => {
    const dir = workdir({
      "throws.test.mjs": 'throw new Error("boom on import");\n',
      "ok.test.mjs": PASSING,
    });
    const results = path.join(dir, "results.json");
    run(dir, ["throws.test.mjs", "ok.test.mjs"], { results });

    const doc = readResults(results);
    assert.ok(doc.suite_errors >= 1);
    assert.equal(
      doc.tests.some((entry) => entry.file === "throws.test.mjs"),
      false
    );
    assert.deepEqual(
      doc.tests.map((entry) => [entry.file, entry.status]),
      [["ok.test.mjs", "passed"]]
    );
  });

  test("with PHARN_TEST_RESULTS unset it writes nothing and spec still prints", () => {
    const dir = workdir({ "ok.test.mjs": PASSING });
    const child = run(dir, ["ok.test.mjs"]);

    assert.equal(child.status, 0);
    assert.deepEqual(readdirSync(dir), ["ok.test.mjs"]);
    const stdout = stripAnsi(child.stdout);
    assert.match(stdout, /✔ passes/);
    assert.match(stdout, /ℹ pass 1/);
    assert.match(stdout, /ℹ fail 0/);
  });

  test("a file named twice is run once, so its tests are not duplicated", () => {
    const dir = workdir({ "mixed.test.mjs": MIXED });
    const results = path.join(dir, "results.json");
    run(dir, ["mixed.test.mjs", "mixed.test.mjs"], { results });

    const ids = readResults(results).tests.map((entry) => `${entry.file}|${entry.path.join(">")}`);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, 6);
  });
});
