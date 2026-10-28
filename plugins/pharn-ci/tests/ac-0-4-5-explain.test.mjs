// Acceptance tests for pharn-ci-plugin-0-4-5: AC-5 (pharn-ci-explain names every 0.3.0 and 0.4.0 code with its
// default level), AC-6 (P01's and P10's codes, the 📜 Policy section, the report's policy object, meta.isAgentPr) and
// AC-7 (text guards, the accept-label boundary, what a file: policy may not set, precedence). The skill text is read
// inside each test body.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const EXPLAIN = fileURLToPath(new URL("../skills/pharn-ci-explain/", import.meta.url));

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

// SKILL.md and every references/*.md of pharn-ci-explain, concatenated.
function explainText() {
  const parts = [readFileSync(join(EXPLAIN, "SKILL.md"), "utf8")];
  const refs = join(EXPLAIN, "references");
  if (existsSync(refs)) {
    for (const f of readdirSync(refs).sort()) if (f.endsWith(".md")) parts.push(readFileSync(join(refs, f), "utf8"));
  }
  return parts.join("\n\n");
}

// Paragraphs: runs of lines between blank lines, with their line breaks folded to spaces.
const paragraphs = (text) =>
  text
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

const token = (code) => new RegExp(`(?<![A-Za-z0-9_])${code}(?![A-Za-z0-9_])`);
const LEVEL = /\b(?:block|error|warn|info)\b/i;

test("AC-5: pharn-ci-explain names every pharn-ci 0.3.0 and 0.4.0 code on a heading or table row with its default level", () => {
  const lines = explainText().split("\n");
  const missing = SCOPE_CODES.filter((code) => {
    const re = token(code);
    return !lines.some((l) => /^\s*(?:#{1,6}\s|\|)/.test(l) && re.test(l) && LEVEL.test(l.replace(new RegExp(re.source, "g"), " ")));
  });
  assert.deepEqual(missing, [], "codes with no heading or table row that also names a level (block, error, warn or info)");
});

test("AC-6: pharn-ci-explain maps P01 and P10 to their codes and describes the 📜 Policy section, the report's policy object and meta.isAgentPr", () => {
  const ps = paragraphs(explainText());
  const some = (label, ...res) =>
    assert.ok(
      ps.some((p) => res.every((re) => re.test(p))),
      `no passage ${label}`
    );
  some(
    "names P01 with NO_AGENT_SETUP_FILES and AGENT_SETUP_EXPECTED_MISSING",
    /\bP01\b/,
    token("NO_AGENT_SETUP_FILES"),
    token("AGENT_SETUP_EXPECTED_MISSING")
  );
  some("names P10 with POLICY_UNAVAILABLE", /\bP10\b/, token("POLICY_UNAVAILABLE"));
  some('describes the "📜 Policy" comment section', /📜 Policy/);
  some(
    "describes the report's policy object with a violation's path and line",
    /`(?:report\.)?policy`/,
    /violation/i,
    /\bpath\b/i,
    /\bline\b/i
  );
  some("names meta.isAgentPr", /meta\.isAgentPr\b/);
});

test("AC-7: pharn-ci-explain states the text-guard, accept-label, file: policy and precedence boundaries", () => {
  const ps = paragraphs(explainText());
  const some = (label, ...res) =>
    assert.ok(
      ps.some((p) => res.every((re) => re.test(p))),
      `no passage ${label}`
    );
  some(
    "saying P02 to P06 are text guards, not a security boundary",
    /\bP02\s*(?:–|—|-|to|through|\.\.)\s*P06\b/,
    /\btext guards?\b/i,
    /(?:\bnot\b|n't\b|\bno\b|\bnever\b)[^.]{0,40}\bsecurity boundary/i
  );
  some(
    "saying the accept label signs off test-integrity findings only and no policy rule reads it",
    /\baccept(?:[ _-]|ed )label\b|accept_label/i,
    /test[- ]integrity/i,
    /\bonly\b/i,
    /\bno (?:policy )?rule (?:ever )?reads\b|\bno policy rule\b|\bpolicy rules? (?:never|do(?:es)? not|don't|doesn't) read\b|\bnever touches P11\b/i
  );
  some(
    "saying a file: policy may not set an accept label",
    /`?file:/,
    /\baccept(?:[ _-]|ed )label\b|accept_label/i,
    /\b(?:may not|cannot|can't|must not|not allowed to|never)\b/i
  );
  some(
    "giving the precedence: workflow inputs beat .pharn/ci.yml, an app policy beats both, a file: policy can only raise",
    /\bworkflow inputs?\b/i,
    /\.pharn\/ci\.yml/,
    /\bapp policy\b/i,
    /`?file:/,
    /\bonly (?:raise|tighten)/i
  );
});
