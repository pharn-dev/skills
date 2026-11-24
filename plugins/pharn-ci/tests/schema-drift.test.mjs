// The pharn-ci skills against pharn-ci's own schemas: every message code of pharn-ci's code table is named in
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

// Byte copies of pharn-ci v0.12.0's schema/report.v2.json, schema/policy.v1.json and docs/output.md (the code table
// the report schema's code description points to).
const REPORT_SCHEMA = "tests/fixtures/report.v2.json";
const POLICY_SCHEMA = "skills/pharn-ci-policy/scripts/policy.v1.json";
const CODE_TABLE = "tests/fixtures/output.md";
const PINS = {
  [REPORT_SCHEMA]: "28cccae3b984e0bd089392e5a422353c3f61ca4aa647eed731f33141ebaed685",
  [POLICY_SCHEMA]: "a9272db9565d6c950322f8e0738200d28db308ac7b8fa890a84fa9707c021cd2",
  [CODE_TABLE]: "e9ab922ee64f0c5a168c47af0f9ad5ef308ebb242a3f002e28e373c7b4448f5a",
};

describe("pharn-ci skills against pharn-ci v0.12.0's schemas", () => {
  test("the schema and code table copies are pharn-ci v0.12.0's", () => {
    for (const [rel, sha] of Object.entries(PINS)) {
      const digest = createHash("sha256")
        .update(readFileSync(PLUGIN + rel))
        .digest("hex");
      assert.equal(digest, sha, rel);
    }
  });

  test("pharn-ci-explain's codes.md names every message code of the code table", () => {
    const codes = reportCodes(read(CODE_TABLE));
    assert.ok(codes.length >= 89, `only ${codes.length} codes read`);
    assert.deepEqual(missingCodes(read("skills/pharn-ci-explain/references/codes.md"), codes), []);
  });

  test("pharn-ci-explain names every code of the code table with its level, on a heading or a table row", () => {
    const lines = ["codes.md", "policy.md"].flatMap((f) => read(`skills/pharn-ci-explain/references/${f}`).split("\n"));
    for (const code of reportCodes(read(CODE_TABLE))) {
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
  const codeTable = [
    "Branch on `NOT_A_ROW` codes.",
    "",
    "| Code | Meaning |",
    "| ---- | ------- |",
    "| `BETA_TWO` | A thing (`warn`); `IN_TEXT` is not a row |",
    "| `ALPHA_ONE`   | Another |",
    "| `GAMMA_THREE` | TI01 and SI02 are signal ids |",
    "| `ALPHA_ONE` | Named twice |",
    "| TI01 | Not in backticks |",
  ].join("\n");
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
    assert.deepEqual(reportCodes(codeTable), ["ALPHA_ONE", "BETA_TWO", "GAMMA_THREE"]);
    assert.deepEqual(policyKeyPaths(policySchema), [
      "version",
      "injection",
      "injection.exempt",
      "injection.signals",
      "injection.signals.PI01",
    ]);

    const codes = reportCodes(codeTable);
    assert.deepEqual(missingCodes("### `ALPHA_ONE` (warn)\n\nGAMMA_THREE and BETA_TWO_X", codes), ["BETA_TWO"]);
    assert.deepEqual(missingCodes("ALPHA_ONE, BETA_TWO and `GAMMA_THREE`.", codes), []);

    const keys = policyKeyPaths(policySchema);
    assert.deepEqual(missingKeys("`version` `injection` `injection.exempt` `injection.signals` and injection.signals.PI01", keys), [
      "injection.signals.PI01",
    ]);
    assert.deepEqual(missingKeys("`version`, `injection`, `injection.exempt`, `injection.signals`, `injection.signals.PI01`", keys), []);
  });
});
