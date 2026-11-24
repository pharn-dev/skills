// The pharn-ci skills against pharn-ci's own schemas: every message code of the report schema is named in
// pharn-ci-explain's codes.md, on a heading or table row with its level, every fix kind is named in the references
// that explain the fix object, and every key path of the policy schema is named in pharn-ci-policy's keys.md. When
// pharn-ci adds a code, a kind or a key, update the pinned schema copy and the reference together, or this test fails.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { missingCodes, missingKeys, policyKeyPaths, reportCodes } from "./lib/schema-drift.mjs";

const PLUGIN = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(PLUGIN + rel, "utf8");

// Byte copies of pharn-ci v0.11.0's schema/report.v2.json and schema/policy.v1.json.
const REPORT_SCHEMA = "tests/fixtures/report.v2.json";
const POLICY_SCHEMA = "skills/pharn-ci-policy/scripts/policy.v1.json";
const PINS = {
  [REPORT_SCHEMA]: "d32e422f1190c2f40e7a757b3948ccd9c0417f1fde3c514ba83c8e54d6a6bc4d",
  [POLICY_SCHEMA]: "f247accd493adfa2c9f89668e8b28358b7a6c1343b631b32ecb903e0fce7b61d",
};

describe("pharn-ci skills against pharn-ci v0.11.0's schemas", () => {
  test("the schema copies are pharn-ci v0.11.0's", () => {
    for (const [rel, sha] of Object.entries(PINS)) {
      const digest = createHash("sha256")
        .update(readFileSync(PLUGIN + rel))
        .digest("hex");
      assert.equal(digest, sha, rel);
    }
  });

  test("pharn-ci-explain's codes.md names every message code of the report schema", () => {
    const codes = reportCodes(JSON.parse(read(REPORT_SCHEMA)));
    assert.ok(codes.length >= 89, `only ${codes.length} codes read`);
    assert.deepEqual(missingCodes(read("skills/pharn-ci-explain/references/codes.md"), codes), []);
  });

  test("pharn-ci-explain names every code of the report schema with its level, on a heading or a table row", () => {
    const lines = ["codes.md", "policy.md"].flatMap((f) => read(`skills/pharn-ci-explain/references/${f}`).split("\n"));
    for (const code of reportCodes(JSON.parse(read(REPORT_SCHEMA)))) {
      const token = new RegExp(`(?<![A-Za-z0-9_])${code}(?![A-Za-z0-9_])`, "g");
      const row = lines.find((l) => /^\s*(?:#{1,6}\s|\|)/.test(l) && token.test(l));
      assert.ok(row, `${code} has no heading or table row`);
      assert.match(row.replace(token, " "), /\b(?:block|error|warn|info)\b/i, `${code}: ${row}`);
    }
  });

  test("pharn-ci-explain's report.md and pharn-ci-fix's kinds.md name every fix kind of the report schema", () => {
    const kinds = JSON.parse(read(REPORT_SCHEMA)).$defs.fix.properties.kind.enum;
    assert.ok(kinds.length >= 8, `only ${kinds.length} kinds read`);
    for (const rel of ["skills/pharn-ci-explain/references/report.md", "skills/pharn-ci-fix/references/kinds.md"]) {
      assert.deepEqual(missingKeys(read(rel), kinds), [], rel);
    }
  });

  test("pharn-ci-policy's keys.md names every key path of the policy schema", () => {
    const keys = policyKeyPaths(JSON.parse(read(POLICY_SCHEMA)));
    assert.deepEqual(missingKeys(read("skills/pharn-ci-policy/references/keys.md"), keys), []);
  });
});

describe("lib/schema-drift.mjs", () => {
  const reportSchema = {
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
  const policySchema = {
    properties: {
      version: { const: 1 },
      injection: {
        type: "object",
        properties: { exempt: { type: "array" }, signals: { type: "object", properties: { PI01: { type: "string" } } } },
      },
    },
  };

  test("returns exactly the missing code and key path, and [] when nothing is missing", () => {
    assert.deepEqual(reportCodes(reportSchema), ["ALPHA_ONE", "BETA_TWO", "GAMMA_THREE"]);
    assert.deepEqual(policyKeyPaths(policySchema), [
      "version",
      "injection",
      "injection.exempt",
      "injection.signals",
      "injection.signals.PI01",
    ]);

    const codes = reportCodes(reportSchema);
    assert.deepEqual(missingCodes("### `ALPHA_ONE` (warn)\n\nGAMMA_THREE and BETA_TWO_X", codes), ["BETA_TWO"]);
    assert.deepEqual(missingCodes("ALPHA_ONE, BETA_TWO and `GAMMA_THREE`.", codes), []);

    const keys = policyKeyPaths(policySchema);
    assert.deepEqual(missingKeys("`version` `injection` `injection.exempt` `injection.signals` and injection.signals.PI01", keys), [
      "injection.signals.PI01",
    ]);
    assert.deepEqual(missingKeys("`version`, `injection`, `injection.exempt`, `injection.signals`, `injection.signals.PI01`", keys), []);
  });
});
