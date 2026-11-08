// The pharn-ci skills against pharn-ci's own schemas: every message code of the report schema is named in
// pharn-ci-explain's codes.md, and every key path of the policy schema is named in pharn-ci-policy's keys.md. When
// pharn-ci adds a code or a key, update the pinned schema copy and the reference together, or this test fails.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { missingCodes, missingKeys, policyKeyPaths, reportCodes } from "./lib/schema-drift.mjs";

const PLUGIN = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(PLUGIN + rel, "utf8");

// Byte copies of pharn-ci v0.9.1's schema/report.v2.json and schema/policy.v1.json.
const REPORT_SCHEMA = "tests/fixtures/report.v2.json";
const POLICY_SCHEMA = "skills/pharn-ci-policy/scripts/policy.v1.json";
const PINS = {
  [REPORT_SCHEMA]: "8f986f831fc659715d1fd7112aba7fe33734b63779e95cea6825074857a9d665",
  [POLICY_SCHEMA]: "8dcd0f6971d89808deea68d3e5d24ced01ecd9a37b962eb63b04bbd0a9deb4c1",
};

describe("pharn-ci skills against pharn-ci v0.9.1's schemas", () => {
  test("the schema copies are pharn-ci v0.9.1's", () => {
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

  test("pharn-ci-policy's keys.md names every key path of the policy schema", () => {
    const keys = policyKeyPaths(JSON.parse(read(POLICY_SCHEMA)));
    assert.deepEqual(missingKeys(read("skills/pharn-ci-policy/references/keys.md"), keys), []);
  });
});
