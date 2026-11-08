// Acceptance test for pharn-ci-explain-policy-current AC-6: the pharn-ci-explain eval for a D05 block where a lockfile
// resolves to a private registry host. The case files and the fixtures manifest are read inside the test body.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const EVALS = fileURLToPath(new URL("../evals/", import.meta.url));
const CASE = "explain-dependency-d05";

test("AC-6: the D05 private-registry eval has its case, prompt, generated report and an answer grader that never switches the check off", () => {
  const dir = join(EVALS, CASE);
  for (const f of ["case.yaml", "prompt.md", "scaffold.sh", "graders/answer.md"])
    assert.ok(existsSync(join(dir, f)), `${CASE}/${f} is missing`);

  assert.match(readFileSync(join(dir, "case.yaml"), "utf8"), new RegExp(`^name:\\s*${CASE}\\s*$`, "m"), "case.yaml does not name the case");
  assert.notEqual(readFileSync(join(dir, "prompt.md"), "utf8").trim(), "", "prompt.md is empty");

  const scaffold = readFileSync(join(dir, "scaffold.sh"), "utf8");
  assert.match(
    scaffold,
    /"level":\s*"error",\s*"code":\s*"DEPENDENCY_D05"|"code":\s*"DEPENDENCY_D05"[^}]*"level":\s*"error"/,
    "no DEPENDENCY_D05 error message"
  );
  assert.match(scaffold, /"verdict":\s*"fail"/, "the report's verdict is not fail");
  assert.match(scaffold, /[a-z0-9.-]*(?:artifactory|verdaccio)[a-z0-9.-]*\.[a-z]{2,}/i, "no private registry host in the scaffold");

  const manifest = JSON.parse(readFileSync(join(EVALS, "fixtures/manifest.json"), "utf8"));
  const expect = manifest.cases?.[CASE]?.expect;
  assert.ok(expect, `the manifest has no ${CASE} case`);
  assert.equal(expect.verdict, "fail");
  assert.ok(expect.codes.includes("DEPENDENCY_D05"), "the manifest does not expect DEPENDENCY_D05");

  const answer = readFileSync(join(dir, "graders/answer.md"), "utf8");
  assert.match(answer, /\bD05\b/, "the answer grader does not name D05");
  assert.match(answer, /private registr/i, "the answer grader does not name a private registry");
  assert.ok(answer.includes("dependencies: never"), "the answer grader does not name `dependencies: never`");
  assert.match(answer, /allow-?list/i, "the answer grader does not name a registry allow-list");
  assert.match(answer, /\bwarn\b/, "the answer grader does not name a warn level");
});
