// Acceptance test for pharn-ci-explain-policy-current AC-10: the drift module names a code missing from codes.md and a
// key path missing from keys.md, and the drift test reads the pinned schemas and both references. The module is
// imported, and the drift test read, inside each test body.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const LIB = new URL("./lib/schema-drift.mjs", import.meta.url);
const DRIFT_TEST = fileURLToPath(new URL("./schema-drift.test.mjs", import.meta.url));

const REPORT_SCHEMA = {
  $defs: {
    message: {
      properties: {
        code: {
          description:
            "Known codes: ALPHA_ONE, BETA_TWO. Codes added in v0.7.0: GAMMA_THREE (warn: a thing; TI01 and SI02 are signal ids, JS/TS is not a code).",
        },
      },
    },
  },
};

const POLICY_SCHEMA = {
  properties: {
    version: { const: 1 },
    injection: {
      type: "object",
      properties: { exempt: { type: "array" }, signals: { type: "object", properties: { PI01: { type: "string" } } } },
    },
  },
};

test("AC-10: the drift module returns exactly the missing code and key path, and [] when nothing is missing", async () => {
  const { reportCodes, policyKeyPaths, missingCodes, missingKeys } = await import(LIB);

  assert.deepEqual(reportCodes(REPORT_SCHEMA), ["ALPHA_ONE", "BETA_TWO", "GAMMA_THREE"]);
  assert.deepEqual(policyKeyPaths(POLICY_SCHEMA), [
    "version",
    "injection",
    "injection.exempt",
    "injection.signals",
    "injection.signals.PI01",
  ]);

  const codes = reportCodes(REPORT_SCHEMA);
  assert.deepEqual(missingCodes("### `ALPHA_ONE` (warn)\n\nGAMMA_THREE and BETA_TWO_X", codes), ["BETA_TWO"]);
  assert.deepEqual(missingCodes("ALPHA_ONE, BETA_TWO and `GAMMA_THREE`.", codes), []);

  const keys = policyKeyPaths(POLICY_SCHEMA);
  assert.deepEqual(missingKeys("`version` `injection` `injection.exempt` `injection.signals` and injection.signals.PI01", keys), [
    "injection.signals.PI01",
  ]);
  assert.deepEqual(missingKeys("`version`, `injection`, `injection.exempt`, `injection.signals`, `injection.signals.PI01`", keys), []);
});

test("AC-10: the drift test imports the module and reads the pinned schemas and both references", () => {
  const text = readFileSync(DRIFT_TEST, "utf8");
  assert.match(
    text,
    /from\s+["']\.\/lib\/schema-drift\.mjs["']|import\(\s*["']\.\/lib\/schema-drift\.mjs["']/,
    "the drift test does not import lib/schema-drift.mjs"
  );
  for (const f of ["fixtures/report.v2.json", "references/codes.md", "scripts/policy.v1.json", "references/keys.md"]) {
    assert.ok(text.includes(f), `the drift test does not read ${f}`);
  }
});
