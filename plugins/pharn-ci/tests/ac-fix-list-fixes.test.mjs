// Acceptance tests for pharn-ci-fix-skill AC-5 to AC-7: the pharn-ci-fix helper scripts/list-fixes.mjs lists the fix
// objects of a Report v2 JSON file, names each malformed one by its JSON Pointer, and handles a report with none.
// The helper is run (and imported) inside each test body.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HELPER = fileURLToPath(new URL("../skills/pharn-ci-fix/scripts/list-fixes.mjs", import.meta.url));

const KINDS = ["add-test", "restore-test", "restore-assertion", "revert-config", "remove-dependency", "request-review", "split-pr", "none"];

function runOn(report) {
  const dir = mkdtempSync(path.join(tmpdir(), "list-fixes-"));
  try {
    const file = path.join(dir, "report.json");
    writeFileSync(file, JSON.stringify(report));
    const r = spawnSync(process.execPath, [HELPER, "--report", file], { encoding: "utf8", timeout: 30_000 });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parsed(r) {
  try {
    return JSON.parse(r.stdout);
  } catch {
    assert.fail(`stdout is not one JSON document (exit ${r.status}): ${r.stdout}${r.stderr}`);
  }
}

const base = () => ({
  schemaVersion: 2,
  tool: { name: "pharn-ci", version: "0.9.0" },
  verdict: "fail",
  diffCoverage: null,
  agentSetup: { files: [] },
  messages: [],
  testIntegrity: { mode: "block", signals: [] },
});

function validReport() {
  const r = base();
  r.messages = [
    {
      level: "error",
      code: "DIFF_COVERAGE_BELOW_THRESHOLD",
      text: "Diff coverage 71.43% is below the threshold of 80%.",
      fix: { kind: "add-test", hint: "Add tests that run the changed lines listed in the report." },
    },
    {
      level: "warn",
      code: "POLICY_UNAVAILABLE",
      text: "The org policy could not be fetched.",
      fix: { kind: "none", hint: "Check that the org policy can be fetched." },
    },
  ];
  r.testIntegrity.signals = [
    {
      id: "TI03",
      level: "error",
      path: "test/cart.test.mjs",
      line: 12,
      fix: { kind: "restore-test", target: "test/cart.test.mjs:12", hint: "Remove the marker that turns this test off, so it runs again." },
    },
  ];
  r.policy = {
    violations: [
      {
        id: "P14",
        level: "error",
        path: null,
        line: null,
        fix: { kind: "split-pr", hint: "Split the change into smaller pull requests." },
      },
    ],
  };
  r.setupHealth = {
    stale: [
      { id: "SI01", path: "AGENTS.md", line: 3, fix: { kind: "none", target: "AGENTS.md:3", hint: "Update this agent instruction." } },
    ],
  };
  r.injection = {
    signals: [
      {
        id: "PI03",
        path: "README.md",
        line: 9,
        fix: { kind: "request-review", target: "README.md:9", hint: "Ask a reviewer to look at this line." },
      },
    ],
  };
  r.dependencies = {
    signals: [
      {
        id: "D05",
        path: "package.json",
        line: null,
        fix: { kind: "remove-dependency", target: "package.json", hint: "Remove the dependency." },
      },
    ],
  };
  return r;
}

test("AC-5: list-fixes exits 0 and lists every valid fix with where it sits, its code or id, kind, target and hint, by kind", async () => {
  const report = validReport();
  const r = runOn(report);
  assert.equal(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  const out = parsed(r);
  assert.equal(out.ok, true);
  assert.deepEqual(out.problems, []);
  assert.equal(out.fixes.length, 7);

  const find = (array, index) => out.fixes.find((f) => f.array === array && f.index === index);
  const m0 = find("messages", 0);
  assert.ok(m0, "no entry for messages[0]");
  assert.equal(m0.code, "DIFF_COVERAGE_BELOW_THRESHOLD");
  assert.equal(m0.kind, "add-test");
  assert.equal(m0.hint, "Add tests that run the changed lines listed in the report.");
  assert.equal("target" in m0, false, "a message fix has a target in the listing");
  const t0 = find("testIntegrity.signals", 0);
  assert.ok(t0, "no entry for testIntegrity.signals[0]");
  assert.equal(t0.id, "TI03");
  assert.equal(t0.kind, "restore-test");
  assert.equal(t0.target, "test/cart.test.mjs:12");
  assert.equal(find("policy.violations", 0)?.id, "P14");
  assert.equal(find("policy.violations", 0)?.kind, "split-pr");
  assert.equal(find("setupHealth.stale", 0)?.target, "AGENTS.md:3");
  assert.equal(find("injection.signals", 0)?.kind, "request-review");
  assert.equal(find("dependencies.signals", 0)?.kind, "remove-dependency");
  assert.equal(find("messages", 1)?.code, "POLICY_UNAVAILABLE");

  assert.deepEqual(Object.keys(out.byKind), KINDS);
  for (const kind of KINDS) {
    const expected = out.fixes.filter((f) => f.kind === kind);
    assert.deepEqual(out.byKind[kind], expected, `byKind[${kind}] does not hold exactly the fixes of that kind`);
  }
  assert.equal(out.byKind.none.length, 2);

  const { listFixes } = await import("../skills/pharn-ci-fix/scripts/list-fixes.mjs");
  assert.deepEqual(listFixes(report), out);
});

test("AC-6: list-fixes exits non-zero and names each malformed fix by its JSON Pointer", () => {
  const r0 = validReport();
  r0.messages[0].fix.target = "src/cart.mjs";
  r0.messages[1].fix.kind = "lower-threshold";
  r0.testIntegrity.signals[0].fix.hint = "x".repeat(201);
  r0.policy.violations[0].fix.extra = "anything";
  const r = runOn(r0);
  assert.notEqual(r.status, 0, "a report with malformed fixes exited 0");
  assert.equal(r.status, 1, `exit ${r.status}: ${r.stderr}`);
  const out = parsed(r);
  const pointers = out.problems.map((p) => p.pointer);
  for (const pointer of [
    "/messages/1/fix/kind",
    "/testIntegrity/signals/0/fix/hint",
    "/policy/violations/0/fix/extra",
    "/messages/0/fix/target",
  ]) {
    assert.ok(pointers.includes(pointer), `no problem names ${pointer}; got ${JSON.stringify(pointers)}`);
  }
});

test("AC-7: list-fixes exits 0 on a report with no fix objects, with no fixes and the count of entries that have none", () => {
  const report = base();
  report.tool.version = "0.4.0";
  report.messages = [
    { level: "error", code: "DIFF_COVERAGE_BELOW_THRESHOLD", text: "Diff coverage 50% is below the threshold of 80%." },
    { level: "info", code: "TEST_INTEGRITY_OFF", text: "Test integrity is off." },
  ];
  report.testIntegrity.signals = [{ id: "TI03", level: "error", path: "test/a.test.mjs", line: 4 }];
  const r = runOn(report);
  assert.equal(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  const out = parsed(r);
  assert.deepEqual(out.fixes, []);
  assert.equal(out.withoutFix, 3);
});
