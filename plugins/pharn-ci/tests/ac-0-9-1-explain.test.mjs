// Acceptance tests for pharn-ci-explain-policy-current AC-2 to AC-5: what pharn-ci-explain says about the codes, the
// behaviour changes, the report objects and the fix object of pharn-ci 0.5.0 to 0.9.1, and its verdict and Never
// sections. The skill files and the pinned schema copy are read inside each test body.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PLUGIN = fileURLToPath(new URL("../", import.meta.url));
const EXPLAIN = join(PLUGIN, "skills/pharn-ci-explain");
const REPORT_SCHEMA = join(PLUGIN, "tests/fixtures/report.v2.json");
const REPORT_SCHEMA_SHA256 = "8f986f831fc659715d1fd7112aba7fe33734b63779e95cea6825074857a9d665";

// The codes pharn-ci's report schema lists after v0.4.0 (v0.6.0 to v0.8.0), read from both tags' schema/report.v2.json.
const NEW_CODES = [
  "POLICY_P13",
  "POLICY_P14",
  "INJECTION_PI01",
  "INJECTION_PI02",
  "INJECTION_PI03",
  "INJECTION_PI04",
  "INJECTION_PI05",
  "INJECTION_TEXT_TRUNCATED",
  "SETUP_STALE_SI01",
  "SETUP_STALE_SI02",
  "SETUP_STALE_SI03",
  "SETUP_STALE_SI04",
  "TESTS_NOT_EXERCISING_CHANGES",
  "DEPENDENCY_CHECK_INCOMPLETE",
  "DEPENDENCY_D01",
  "DEPENDENCY_D02",
  "DEPENDENCY_D03",
  "DEPENDENCY_D04",
  "DEPENDENCY_D05",
  "DEPENDENCY_LOOKUP_UNAVAILABLE",
  "FLAKY_QUARANTINED_FAILURES",
  "JUNIT_INVALID",
  "JUNIT_NOT_FOUND",
  "JUNIT_TOO_LARGE",
];

const KINDS = ["add-test", "restore-test", "restore-assertion", "revert-config", "remove-dependency", "request-review", "split-pr", "none"];

function read(rel) {
  return readFileSync(join(EXPLAIN, rel), "utf8");
}

function token(code) {
  return new RegExp(`(?<![A-Za-z0-9_])${code}(?![A-Za-z0-9_])`);
}

// The text from the first heading line matching `heading` up to the next heading of the same or a higher level.
function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && heading.test(l));
  assert.notEqual(start, -1, `no heading matching ${heading}`);
  const level = /^(#+)/.exec(lines[start])[1].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#+)\s/.exec(lines[i]);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

// Paragraphs and list items, wrapped lines folded.
function blocks(text) {
  return text
    .split(/\n[ \t]*\n|\n(?=[ \t]*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|\|))/)
    .map((b) => b.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function sentences(text) {
  const body = text.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$/gm, "");
  return blocks(body).flatMap((b) => b.split(/(?<=[.!?;])\s+/));
}

test("AC-2: codes.md names every code of v0.9.1's report schema, and each new code sits on a heading or table row with its level", () => {
  const raw = readFileSync(REPORT_SCHEMA);
  assert.equal(createHash("sha256").update(raw).digest("hex"), REPORT_SCHEMA_SHA256, "tests/fixtures/report.v2.json is not v0.9.1's");
  const description = JSON.parse(raw.toString("utf8")).$defs.message.properties.code.description;
  const codes = [...new Set(description.match(/(?<![A-Za-z0-9_])[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+(?![A-Za-z0-9_])/g))];
  assert.ok(codes.length >= 89, `only ${codes.length} codes read from the schema`);
  for (const code of NEW_CODES) assert.ok(codes.includes(code), `${code} is not in the schema's code list`);

  const codesMd = read("references/codes.md");
  const missing = codes.filter((c) => !token(c).test(codesMd));
  assert.deepEqual(missing, [], "codes.md does not name these codes");

  const lines = [codesMd, read("references/policy.md")].flatMap((t) => t.split("\n"));
  for (const code of NEW_CODES) {
    const re = token(code);
    const row = lines.find((l) => /^\s*(?:#{1,6}\s|\|)/.test(l) && re.test(l));
    assert.ok(row, `${code} has no heading or table row`);
    assert.match(row.replace(new RegExp(re.source, "g"), " "), /\b(?:info|warn|error|block)\b/i, `${code}: ${row}`);
  }
});

test("AC-3: codes.md states the fail-on-verdict rename and the behaviour changes of 0.5.0 to 0.8.0", () => {
  const text = section(read("references/codes.md"), /Behaviour changes/);
  assert.ok(text.includes("fail-on-verdict"), "the section does not name fail-on-verdict");
  assert.ok(text.includes("fail-on-threshold"), "the section does not name fail-on-threshold");
  const bs = blocks(text);
  const has = (version, ...res) => bs.some((b) => b.includes(version) && res.every((re) => re.test(b)));
  assert.ok(has("0.5.0", /\berrors?\b/), "no 0.5.0 block names a warning that became an error");
  assert.ok(has("0.6.0", /tighten/i, /\.pharn\/ci\.yml/), "no 0.6.0 block names .pharn/ci.yml tighten-only");
  assert.ok(has("0.7.0", /\bPI01\b/, /TESTS_NOT_EXERCISING_CHANGES/), "no 0.7.0 block names PI01 and TESTS_NOT_EXERCISING_CHANGES");
  assert.ok(has("0.8.0", /\bD04\b/, /\bD05\b/), "no 0.8.0 block names D04 and D05");
});

test("AC-4: report.md describes the new report objects and the fix object, and pharn-ci-cover carries the same file", () => {
  const text = read("references/report.md");
  for (const name of [
    "injection",
    "setupHealth.stale",
    "testIntegrity.exercise",
    "dependencies",
    "flaky",
    "fix",
    "kind",
    "hint",
    "target",
    ...KINDS,
  ]) {
    assert.ok(text.includes(`\`${name}\``), `report.md does not name \`${name}\``);
  }
  const ss = sentences(text);
  const fixRef = /`fix`|fix object/;
  assert.ok(
    ss.some((s) => fixRef.test(s) && /\bnever\b/i.test(s) && /\bverdicts?\b/i.test(s)),
    "no sentence says fix never changes a verdict"
  );
  assert.ok(
    ss.some((s) => fixRef.test(s) && s.includes("report.json") && /\bcomment\b/i.test(s) && /\b(?:not|never)\b/i.test(s)),
    "no sentence says fix is in report.json and not in the PR comment"
  );
  const cover = readFileSync(join(PLUGIN, "skills/pharn-ci-cover/references/report.md"));
  assert.ok(
    cover.equals(readFileSync(join(EXPLAIN, "references/report.md"))),
    "pharn-ci-cover's report.md differs from pharn-ci-explain's"
  );
});

test("AC-5: SKILL.md names the four new comment sections and the dependency, injection and quarantine Never rules", () => {
  const skill = read("SKILL.md");
  const verdict = section(skill, /Read the verdict/);
  for (const name of ["📄 Instructions", "🧬 Content", "📦 Dependencies", "🧫 Flaky"]) {
    assert.ok(verdict.includes(name), `"Read the verdict" does not name ${name}`);
  }
  const never = blocks(section(skill, /^## Never\b/)).filter((b) => /^[-*+]\s/.test(b));
  assert.ok(never.length > 0, "the Never section has no bullets");
  const any = (re) => never.some((b) => re.test(b));
  assert.ok(any(/`dependencies: never`/), "no Never bullet names `dependencies: never`");
  assert.ok(any(/`injection\.exempt`/), "no Never bullet names `injection.exempt`");
  assert.ok(any(/\bquarantine/i), "no Never bullet names a quarantine entry");
  assert.ok(
    never.some((b) => /\binjection\b/i.test(b) && /\b(?:repeat|repeating|quote|quoting|copy|copying)\b/i.test(b)),
    "no Never bullet forbids repeating an injection finding's content"
  );
});
