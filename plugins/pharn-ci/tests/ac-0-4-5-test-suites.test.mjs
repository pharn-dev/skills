// Acceptance test for pharn-ci-plugin-0-4-5 AC-14 (integration): the suites of the root package.json `test` script pass,
// and the plugin's own tests cover pharn-ci v0.4.0, the pharn-ci-policy skill and the codes in Scope.
// The suites run in a child `node --test` over the script's globs MINUS this file (never `npm test`, which would run
// this test again without end), with NODE_TEST_CONTEXT and PHARN_TEST_RESULTS removed from the child's environment so
// it neither reports into this runner nor writes the person's per-test results file.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const TESTS = fileURLToPath(new URL("./", import.meta.url));
const V040_SHA = "a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756";

const SCOPE_CODES = [
  "TEST_INTEGRITY_TI02",
  "TEST_INTEGRITY_TI05",
  "TEST_INTEGRITY_TI06",
  "TEST_INTEGRITY_TI07",
  "TEST_INTEGRITY_TI08",
  "TEST_INTEGRITY_TI09",
  "TEST_INTEGRITY_TI12",
  "TEST_INTEGRITY_TI15",
  "TEST_INTEGRITY_TI16",
  "TEST_INTEGRITY_INDEX_UNAVAILABLE",
  "POLICY_UNAVAILABLE",
  "POLICY_OVERRIDE_IGNORED",
  "POLICY_P02",
  "POLICY_P03",
  "POLICY_P04",
  "POLICY_P05",
  "POLICY_P06",
  "POLICY_P07",
  "POLICY_P08",
  "POLICY_P09",
  "POLICY_P11",
  "POLICY_SETTINGS_INVALID",
  "AGENT_PR_DETECTION_INCOMPLETE",
  ...Array.from({ length: 11 }, (_, i) => `AGENT_CONFIG_SECRET_S${String(i + 1).padStart(2, "0")}`),
  "AGENT_CONFIG_SECRET_UNSCANNED",
  "UPLOAD_TOO_LARGE",
];

// The test files the root `test` script names: its positional arguments, each a path or a `dir/*.ext`-style glob
// (one `*` in the file name), expanded here.
function suiteFiles() {
  const script = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts.test;
  const tokens = script.split(/\s+/).filter((t) => !t.startsWith("-") && t !== "node" && /\.m?[jt]s$/.test(t));
  const files = [];
  for (const t of tokens) {
    // A reporter module (`./x.mjs` after --test-reporter=) is joined to its flag, so it never reaches here.
    if (!t.includes("*")) {
      files.push(join(ROOT, t));
      continue;
    }
    const dir = join(ROOT, dirname(t));
    const [head, tail] = basename(t).split("*");
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) if (f.startsWith(head) && f.endsWith(tail)) files.push(join(dir, f));
  }
  return files;
}

test(
  "AC-14: the root test script's suites pass, and the plugin tests cover v0.4.0, pharn-ci-policy and the Scope codes",
  { timeout: 480_000 },
  () => {
    const files = suiteFiles().filter((f) => f !== SELF);
    assert.ok(files.length > 1, "the root test script names no suites");
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    delete env.PHARN_TEST_RESULTS;
    const r = spawnSync(process.execPath, ["--test", ...files], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      timeout: 450_000,
      maxBuffer: 256 * 1024 * 1024,
    });
    assert.equal(
      r.status,
      0,
      `the suites failed (exit ${r.status}${r.signal ? `, ${r.signal}` : ""}):\n${(r.stdout ?? "").slice(-8000)}\n${(r.stderr ?? "").slice(-4000)}`
    );

    // The plugin's own tests, not this feature's acceptance tests (ac-*.test.mjs).
    const pluginTests = readdirSync(TESTS)
      .filter((f) => f.endsWith(".test.mjs") && !f.startsWith("ac-"))
      .map((f) => readFileSync(join(TESTS, f), "utf8"))
      .join("\n");
    assert.ok(pluginTests.includes(V040_SHA) || /\b0\.4\.0\b/.test(pluginTests), "no plugin test references pharn-ci v0.4.0");
    assert.ok(pluginTests.includes("pharn-ci-policy"), "no plugin test references the pharn-ci-policy skill");
    const missing = SCOPE_CODES.filter((code) => !new RegExp(`(?<![A-Za-z0-9_])${code}(?![A-Za-z0-9_])`).test(pluginTests));
    assert.deepEqual(missing, [], "Scope codes no plugin test references");
  }
);
