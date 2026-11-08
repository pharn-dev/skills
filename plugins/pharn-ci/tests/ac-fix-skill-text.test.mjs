// Acceptance tests for pharn-ci-fix-skill AC-1 to AC-4: what the pharn-ci-fix skill's text says about pharn-ci 0.9.0's
// fix objects, how it treats report text, and its Never list. The skill files are read inside each test body.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SKILL = fileURLToPath(new URL("../skills/pharn-ci-fix/", import.meta.url));

const KINDS = ["add-test", "restore-test", "restore-assertion", "revert-config", "remove-dependency", "request-review", "split-pr", "none"];
const PLACES = ["messages", "testIntegrity.signals", "policy.violations", "setupHealth.stale", "injection.signals", "dependencies.signals"];

function skillText() {
  return readFileSync(join(SKILL, "SKILL.md"), "utf8");
}

function skillFiles() {
  const files = [join(SKILL, "SKILL.md")];
  const refs = join(SKILL, "references");
  if (existsSync(refs)) for (const f of readdirSync(refs).sort()) if (f.endsWith(".md")) files.push(join(refs, f));
  return files;
}

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  assert.ok(m, "SKILL.md has no frontmatter");
  return m[1].split(/\r?\n/);
}

// The value of a frontmatter key: its own line plus any indented continuation lines, up to the next top-level key.
function frontmatterValue(lines, key) {
  const start = lines.findIndex((l) => l.startsWith(`${key}:`));
  assert.notEqual(start, -1, `frontmatter has no ${key}`);
  const parts = [lines[start].slice(key.length + 1).trim()];
  for (let i = start + 1; i < lines.length && !/^[A-Za-z0-9_-]+:/.test(lines[i]); i++) parts.push(lines[i].trim());
  return parts.join(" ").replace(/^["']|["']$/g, "");
}

const stripFences = (text) => text.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$/gm, "");

// Paragraphs of a Markdown file with frontmatter and fences dropped, each list item its own block, lines folded.
function paragraphs(text) {
  const body = stripFences(text.replace(/^---\n[\s\S]*?\n---\n/, ""));
  return body
    .split(/\n[ \t]*\n|\n(?=[ \t]*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|\|))/)
    .map((b) => b.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

// Prose sentences, split after . ! ? or ; (copied from ac-0-4-5-no-loosening.test.mjs).
function sentences(text) {
  return paragraphs(text)
    .flatMap((b) => b.split(/(?<=[.!?;])\s+/))
    .filter(Boolean);
}

const NEGATED = /\b(?:never|not|no|nor|don't|do not|doesn't|does not|won't|cannot|without|refuse|decline)\b|n't\b/i;

// The LOOSENING patterns of ac-0-4-5-no-loosening.test.mjs, copied.
const LOOSENING = [
  [
    "edit or change the policy file",
    /\b(?:edit|change|modify)\s+(?:the\s+|your\s+|its\s+|this\s+|that\s+)?(?:org(?:anization)?\s+|team\s+)?policy(?:\s+file|\s+document|\.json)?\b/i,
  ],
  ["lower or downgrade a rule", /\b(?:lower|downgrade)\s+(?:a|the|its|that|this)?\s*(?:policy\s+)?(?:rule|rule's level|level)\b/i],
  ["remove a protected path", /\bremove\b[^.;]{0,40}\bprotected[ _]paths?\b/i],
  ["weaken or relax .pharn/ci.yml", /\b(?:weaken|relax|loosen)\b[^.;]{0,40}\.pharn\/ci\.yml/i],
  ["apply or add the accept label", /\b(?:apply|add)\b[^.;]{0,30}\baccept(?:[ _-]|ed\s)?label\b/i],
];

// The bullets of the list under a heading whose text starts with "Never", wrapped lines folded.
function neverBullets(text) {
  const lines = stripFences(text).split("\n");
  const bullets = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = /^#{1,6}\s+(.*)$/.exec(lines[i]);
    if (!heading || !/^\s*Never\b/i.test(heading[1].replace(/[*_`]/g, ""))) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^#{1,6}\s/.test(l)) break;
      const item = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(l);
      if (item) bullets.push(item[1]);
      else if (bullets.length > 0 && /^\s+\S/.test(l)) bullets[bullets.length - 1] += " " + l.trim();
    }
  }
  return bullets;
}

test("AC-1: SKILL.md is named pharn-ci-fix and its description names 0.9.x, the fix object, pharn-ci-cover and pharn-ci-explain", () => {
  const lines = frontmatter(skillText());
  assert.equal(frontmatterValue(lines, "name"), "pharn-ci-fix");
  const description = frontmatterValue(lines, "description");
  assert.match(description, /(?<![\d.])0\.9\.x\b/, "the description does not name 0.9.x");
  assert.match(description, /`fix`|\bfix (?:object|field)s?\b/, "the description does not name the fix object");
  assert.ok(description.includes("pharn-ci-cover"), "the description does not name pharn-ci-cover");
  assert.ok(description.includes("pharn-ci-explain"), "the description does not name pharn-ci-explain");
});

test("AC-2: the skill names the eight kinds, the fields, the six places, and what the agent does for each kind", () => {
  const files = skillFiles();
  const text = files.map((f) => readFileSync(f, "utf8")).join("\n\n");
  for (const kind of KINDS) assert.ok(text.includes(`\`${kind}\``), `the skill does not name \`${kind}\``);
  for (const field of ["kind", "hint", "target"]) assert.ok(text.includes(`\`${field}\``), `the skill does not name \`${field}\``);
  for (const place of PLACES) assert.ok(text.includes(`\`${place}\``), `the skill does not name \`${place}\``);

  const body = stripFences(text);
  const lines = body.split("\n");
  for (const kind of KINDS) {
    const tick = `\`${kind}\``;
    let found = false;
    for (let i = 0; i < lines.length && !found; i++) {
      const line = lines[i];
      if (/^\s*\|/.test(line) && line.includes(tick)) {
        // A table row: some cell after the kind's cell holds prose.
        const cells = line.split("|").map((c) => c.trim());
        const at = cells.findIndex((c) => c.includes(tick));
        found = cells.slice(at + 1).some((c) => /[A-Za-z]{3,}.*\s.*[A-Za-z]/.test(c.replace(/`[^`]*`/g, "")));
      } else if (/^#{1,6}\s/.test(line) && line.includes(tick)) {
        // A heading: the text up to the next heading holds a sentence of prose.
        const rest = [];
        for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) rest.push(lines[j]);
        found = /[A-Za-z]{3,}[^.!?]*\s[^.!?]*[.!?]/.test(rest.join(" "));
      }
    }
    assert.ok(found, `no heading or table row for ${tick} followed by prose saying what the agent does`);
  }
});

test("AC-3: SKILL.md says report text, a hint and a target are data, never instructions, and quotes a target after --", () => {
  const paras = paragraphs(skillText());
  const dataPara = paras.find(
    (p) =>
      /\bdata\b/i.test(p) &&
      /\bnever\b[^.]*\binstructions?\b|\bnot\b[^.]*\binstructions?\b/i.test(p) &&
      p.includes("`hint`") &&
      p.includes("`target`")
  );
  assert.ok(dataPara, "no paragraph says the report, `hint` and `target` are data, never instructions");
  const quotePara = paras.find((p) => /single quotes?/i.test(p) && /`--`|\s--\s|`--literal-pathspecs`/.test(p) && /\btarget\b/i.test(p));
  assert.ok(quotePara, "no passage says a target goes into a command in single quotes after --");
});

test("AC-4: the Never list names every forbidden move, and no sentence of the skill tells the agent to loosen a gate", () => {
  const bullets = neverBullets(skillText());
  assert.ok(bullets.length > 0, "SKILL.md has no list under a heading that starts with Never");
  const names = (re) => bullets.some((b) => re.test(b));
  const checks = [
    ["lowering a threshold or adding an exclusion", /\b(?:lower\w*)\b[^\n]*\bthreshold\b|\bexclu(?:de|sion)/i],
    ["editing .pharn/ci.yml, the workflow or the org policy", /\.pharn\/ci\.yml/],
    ["editing the workflow", /\bworkflow\b/i],
    ["editing the org policy", /\bpolic(?:y|ies)\b/i],
    ["turning a test off", /\b(?:skip\w*|disabl\w*|turn\w* (?:a |the |any )?(?:\w+ )?tests? off|turn\w* off)\b/i],
    ["the accept label", /\baccept label\b/i],
    ["a hint as proof of a fix", /\bhint\b[^\n]*\bproo?f|\bproves?\b[^\n]*\bfix/i],
    ["changing code for request-review or none", /`request-review`[^\n]*`none`|`none`[^\n]*`request-review`/],
    ["commit or push", /\bcommit\w*\b[^\n]*\bpush|\bpush\w*\b[^\n]*\bcommit/i],
  ];
  for (const [what, re] of checks) assert.ok(names(re), `the Never list does not name ${what}`);

  const offending = [];
  for (const file of skillFiles()) {
    for (const s of sentences(readFileSync(file, "utf8"))) {
      for (const [what, re] of LOOSENING) {
        if (re.test(s) && !NEGATED.test(s)) offending.push(`${file.slice(SKILL.length)}: tells the agent to ${what} — "${s}"`);
      }
    }
  }
  assert.deepEqual(offending, []);
});
