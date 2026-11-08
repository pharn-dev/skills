// Acceptance tests for pharn-ci-explain-policy-current AC-7 to AC-9: pharn-ci-policy's bundled schema is v0.9.1's, its
// key reference names every key path and the .pharn/ci.yml tighten-only rules, and its checker accepts and rejects the
// keys added after 0.4.0. Files are read, and the checker run, inside each test body.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SKILL = fileURLToPath(new URL("../skills/pharn-ci-policy/", import.meta.url));
const SCHEMA = join(SKILL, "scripts/policy.v1.json");
const CHECKER = join(SKILL, "scripts/check-policy.mjs");
const POLICY_SCHEMA_SHA256 = "8dcd0f6971d89808deea68d3e5d24ced01ecd9a37b962eb63b04bbd0a9deb4c1";

function keyPaths(node, prefix = "", out = []) {
  if (node && typeof node === "object" && node.properties) {
    for (const [k, v] of Object.entries(node.properties)) {
      const p = prefix ? `${prefix}.${k}` : k;
      out.push(p);
      keyPaths(v, p, out);
    }
  }
  return out;
}

function blocks(text) {
  return text
    .replace(/^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$/gm, "")
    .split(/\n[ \t]*\n|\n(?=[ \t]*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|\|))/)
    .map((b) => b.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function runChecker(policy) {
  const dir = mkdtempSync(join(tmpdir(), "ac-0-9-1-policy-"));
  try {
    const file = join(dir, "policy.json");
    writeFileSync(file, JSON.stringify(policy));
    return spawnSync(process.execPath, [CHECKER, file], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("AC-7: the bundled schema is v0.9.1's, check-policy.mjs names its digest, and keys.md names every key path", () => {
  const raw = readFileSync(SCHEMA);
  assert.equal(createHash("sha256").update(raw).digest("hex"), POLICY_SCHEMA_SHA256, "scripts/policy.v1.json is not v0.9.1's");
  assert.ok(readFileSync(CHECKER, "utf8").includes(POLICY_SCHEMA_SHA256), "check-policy.mjs does not state the bundled schema's digest");
  const keys = readFileSync(join(SKILL, "references/keys.md"), "utf8");
  const paths = keyPaths(JSON.parse(raw.toString("utf8")));
  for (const p of ["injection.exempt", "injection.signals.PI05", "dependencies.lookup", "policy.rules.P14"])
    assert.ok(paths.includes(p), p);
  const missing = paths.filter((p) => !keys.includes(`\`${p}\``));
  assert.deepEqual(missing, [], "keys.md does not name these key paths in backticks");
});

test("AC-8: the checker accepts injection.* and dependencies.lookup, and names PI06 and a non-boolean lookup", () => {
  const ok = runChecker({
    version: 1,
    injection: { exempt: ["docs/**"], phrases: ["ignore the reviewer"], signals: { PI01: "block", PI03: "warn" } },
    dependencies: { lookup: true },
  });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);

  const bad = runChecker({ version: 1, injection: { signals: { PI06: "warn" } }, dependencies: { lookup: "yes" } });
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  const lines = bad.stdout.split("\n");
  // Each problem line is `<JSON Pointer>: <reason>`.
  assert.ok(
    lines.some((l) => l.startsWith("/injection/signals/PI06")),
    bad.stdout
  );
  assert.ok(
    lines.some((l) => l.startsWith("/dependencies/lookup")),
    bad.stdout
  );
});

test("AC-9: keys.md states the .pharn/ci.yml tighten-only rules of 0.6.0 and that dependencies.lookup never overrules never", () => {
  const bs = blocks(readFileSync(join(SKILL, "references/keys.md"), "utf8"));
  assert.ok(
    bs.some(
      (b) =>
        b.includes(".pharn/ci.yml") &&
        b.includes("0.6.0") &&
        /tighten/i.test(b) &&
        /threshold/i.test(b) &&
        b.includes("`setup.require`") &&
        /test-integrity mode|test_integrity\.mode/.test(b)
    ),
    "no block states the 0.6.0 tighten-only rules for the threshold, setup.require and the test-integrity mode"
  );
  assert.ok(
    bs.some(
      (b) =>
        b.includes("`dependencies.lookup`") &&
        b.includes("`dependencies: never`") &&
        /\bnever\b/i.test(b.replace(/`dependencies: never`/g, "")) &&
        /\b(?:rise|rises|raise|raises|only up)\b/i.test(b)
    ),
    "no block says dependencies.lookup never overrules a never input and the minimums only rise"
  );
});
