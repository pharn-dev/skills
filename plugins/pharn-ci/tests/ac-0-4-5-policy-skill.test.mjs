// Acceptance tests for pharn-ci-plugin-0-4-5: AC-9 (what the pharn-ci-policy skill teaches), AC-10 (its offline
// checker accepts a valid policy.v1 document with Node core only) and AC-11 (it rejects an unknown key, a wrong type
// and a missing version, naming each failing field's JSON Pointer). The skill files and the checker are reached
// inside each test body, so before the build they are failed tests, never an uncollected file.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SKILL = fileURLToPath(new URL("../skills/pharn-ci-policy/", import.meta.url));
const CHECKER = join(SKILL, "scripts/check-policy.mjs");
const SCHEMA = join(SKILL, "scripts/policy.v1.json");
const TOP_LEVEL_KEYS = ["version", "coverage", "setup", "test_integrity", "flaky", "policy", "agents", "dependencies"];

function skillText() {
  const parts = [readFileSync(join(SKILL, "SKILL.md"), "utf8")];
  const refs = join(SKILL, "references");
  if (existsSync(refs)) for (const f of readdirSync(refs).sort()) if (f.endsWith(".md")) parts.push(readFileSync(join(refs, f), "utf8"));
  return parts.join("\n\n");
}

const paragraphs = (text) =>
  text
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  assert.ok(m, "pharn-ci-policy SKILL.md has no frontmatter");
  const lines = m[1].split(/\r?\n/);
  const value = (key) => {
    const i = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (i === -1) return undefined;
    const parts = [lines[i].slice(key.length + 1).trim()];
    for (let j = i + 1; j < lines.length && !/^[A-Za-z0-9_-]+:/.test(lines[j]); j++) parts.push(lines[j].trim());
    return parts
      .join(" ")
      .trim()
      .replace(/^["']|["']$/g, "");
  };
  return { name: value("name"), description: value("description") };
}

function runChecker(doc) {
  const dir = mkdtempSync(join(tmpdir(), "ac-0-4-5-policy-"));
  try {
    const file = join(dir, "policy.json");
    writeFileSync(file, typeof doc === "string" ? doc : JSON.stringify(doc, null, 2));
    const r = spawnSync(process.execPath, [CHECKER, file], { encoding: "utf8", timeout: 30_000 });
    return { status: r.status, output: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("AC-9: pharn-ci-policy names its keys, rules P01 to P11 with their levels, the policy input, policy mode and what stays in the job", () => {
  const fm = frontmatter(readFileSync(join(SKILL, "SKILL.md"), "utf8"));
  assert.equal(fm.name, "pharn-ci-policy");
  assert.ok(fm.description && fm.description.length > 0, "pharn-ci-policy has an empty description");

  const schemaKeys = Object.keys(JSON.parse(readFileSync(SCHEMA, "utf8")).properties ?? {}).sort();
  assert.deepEqual(schemaKeys, [...TOP_LEVEL_KEYS].sort(), "scripts/policy.v1.json's top-level keys are not policy.v1's");

  const text = skillText();
  const missingKeys = schemaKeys.filter((k) => !new RegExp(`(?<![A-Za-z0-9_.-])${k}(?![A-Za-z0-9_-])`).test(text));
  assert.deepEqual(missingKeys, [], "top-level policy keys the skill does not name");

  const lines = text.split("\n");
  const missingRules = Array.from({ length: 11 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`).filter(
    (rule) => !lines.some((l) => new RegExp(`\\b${rule}\\b`).test(l) && /\b(?:error|warn|info)\b/i.test(l))
  );
  assert.deepEqual(missingRules, [], "rules with no line naming their level (error, warn or info)");

  const ps = paragraphs(text);
  const some = (label, ...res) =>
    assert.ok(
      ps.some((p) => res.every((re) => re.test(p))),
      `no passage ${label}`
    );
  for (const value of [/`auto`|\bauto\b/, /`required`|\brequired\b/, /file:<path>|`file:[^`\s]*`/]) {
    assert.match(text, value, `the policy input value ${value} is not named`);
  }
  some("naming auto as the policy input's default", /\bauto\b/, /\bdefault\b/i, /\bpolicy\b/);
  some(
    "saying what auto does with no app policy or no OIDC token (silent, no policy)",
    /\bauto\b/,
    /\bOIDC\b|id-token/i,
    /\bsilent(?:ly)?\b/i,
    /\bno (?:app )?policy\b|\bwithout (?:a |any )?policy\b|\buses no policy\b/i
  );
  assert.match(text, /id-token:\s*write/, "id-token: write is not named");
  for (const file of [".claude/settings.json", ".claude/settings.local.json", ".mcp.json"]) {
    assert.ok(text.includes(file), `the policy-mode file ${file} is not named`);
  }
  some("saying nothing policy mode reads leaves the job", /\bnothing\b[^.]{0,60}\bleaves? the job\b|\bnever leaves? the job\b/i);
});

test("AC-10: the pharn-ci-policy checker accepts a valid policy.v1 document with Node core only and no network", () => {
  const source = readFileSync(CHECKER, "utf8");
  const specifiers = [
    ...source.matchAll(/\bimport\s+(?:[\w*{}\s,$]+\s+from\s+)?["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
    ...source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g),
  ].map((m) => m[1]);
  assert.ok(specifiers.length > 0, "the checker imports nothing");
  for (const s of specifiers) {
    assert.match(s, /^node:/, `the checker imports a non-core module: ${s}`);
    assert.ok(
      !["node:http", "node:https", "node:net", "node:dgram", "node:tls", "node:http2"].includes(s),
      `the checker imports a network module: ${s}`
    );
  }
  assert.doesNotMatch(source, /\bfetch\s*\(/, "the checker calls fetch(");

  const valid = {
    version: 1,
    coverage: { threshold: 80, exclude: ["dist/**"] },
    setup: {
      require: true,
      expect: ["claude-code"],
      consistency: "warn",
      forbidden_permissions: ["Bash(curl:*)"],
      required_permissions_deny: ["Bash(rm:*)"],
      allowed_mcp_servers: [],
      forbidden_files: [".env"],
    },
    test_integrity: { mode: "block", signals: { TI02: "warn", TI15: "block" } },
    flaky: { quarantine: false },
    policy: { required: false, rules: { P02: "block", P11: "warn" } },
    agents: { labels: ["agent"], protected_paths: [".github/workflows/**"], protected_paths_mode: "block", max_files: 50 },
    dependencies: { registries: ["npm"], min_age_days: 7 },
  };
  const r = runChecker(valid);
  assert.equal(r.status, 0, `a valid policy was refused:\n${r.output}`);
  const minimal = runChecker({ version: 1 });
  assert.equal(minimal.status, 0, `the minimal policy { "version": 1 } was refused:\n${minimal.output}`);
});

test("AC-11: the pharn-ci-policy checker refuses an unknown key, a wrong type and a missing version, naming each field's JSON Pointer", () => {
  const cases = [
    [{ version: 1, foo: true }, ["/foo"]],
    [{ version: 1, coverage: { threshold: "80" } }, ["/coverage/threshold"]],
    [{ coverage: { threshold: 80 } }, ["/version"]],
    [{ foo: 1, coverage: { threshold: "80" } }, ["/foo", "/coverage/threshold", "/version"]],
  ];
  for (const [doc, pointers] of cases) {
    const r = runChecker(doc);
    assert.notEqual(r.status, 0, `the checker accepted ${JSON.stringify(doc)}`);
    assert.ok(r.status !== null, `the checker did not exit on ${JSON.stringify(doc)}`);
    for (const pointer of pointers) {
      const named = new RegExp(`(?:^|[\\s"'\`(])${pointer.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&")}(?![A-Za-z0-9_/])`, "m");
      assert.match(r.output, named, `the output for ${JSON.stringify(doc)} does not name ${pointer}:\n${r.output}`);
    }
  }
});
