// Acceptance test for pharn-ci-plugin-0-4-5 AC-8: no pharn-ci skill tells the agent to loosen a gate, and the "Never"
// lists of pharn-ci-explain and pharn-ci-policy name editing the policy, lowering a rule and removing a protected
// path. A lexical check (a negative check can only search for phrasings); the skill files are read inside the test.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SKILLS = fileURLToPath(new URL("../skills/", import.meta.url));
const FOUR = ["pharn-ci-install", "pharn-ci-explain", "pharn-ci-cover", "pharn-ci-policy"];

function skillFiles(skill) {
  const dir = join(SKILLS, skill);
  assert.ok(existsSync(join(dir, "SKILL.md")), `${skill}/SKILL.md does not exist`);
  const files = [join(dir, "SKILL.md")];
  const refs = join(dir, "references");
  if (existsSync(refs)) for (const f of readdirSync(refs).sort()) if (f.endsWith(".md")) files.push(join(refs, f));
  return files;
}

// Prose sentences of a Markdown file: fenced code blocks and frontmatter dropped, each list item, table row and
// heading its own block, wrapped lines folded, then split after . ! ? or ;.
function sentences(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$/gm, "");
  const blocks = body.split(/\n[ \t]*\n|\n(?=[ \t]*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|\|))/);
  return blocks
    .map((b) => b.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .flatMap((b) => b.split(/(?<=[.!?;])\s+/))
    .filter(Boolean);
}

const NEGATED = /\b(?:never|not|no|nor|don't|do not|doesn't|does not|won't|cannot|without|refuse|decline)\b|n't\b/i;

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

test("AC-8: no pharn-ci skill tells the agent to loosen a gate, and the Never lists of explain and policy forbid it", () => {
  const offending = [];
  for (const skill of FOUR) {
    for (const file of skillFiles(skill)) {
      for (const s of sentences(readFileSync(file, "utf8"))) {
        for (const [what, re] of LOOSENING) {
          if (re.test(s) && !NEGATED.test(s)) offending.push(`${file.slice(SKILLS.length)}: tells the agent to ${what} — "${s}"`);
        }
      }
    }
  }
  assert.deepEqual(offending, []);

  for (const skill of ["pharn-ci-explain", "pharn-ci-policy"]) {
    const bullets = neverBullets(readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8"));
    assert.ok(bullets.length > 0, `${skill}/SKILL.md has no "Never" list`);
    const names = (re) => bullets.some((b) => re.test(b));
    assert.ok(
      names(/\b(?:edit|editing|change|changing|modify|modifying)\b[^\n]*\bpolic(?:y|ies)\b/i),
      `${skill}'s Never list does not name editing the policy`
    );
    assert.ok(
      names(/\b(?:lower|lowering|downgrade|downgrading)\b[^\n]*\b(?:rule|level)s?\b/i),
      `${skill}'s Never list does not name lowering a rule`
    );
    assert.ok(
      names(/\b(?:remove|removing)\b[^\n]*\bprotected[ _]paths?\b/i),
      `${skill}'s Never list does not name removing a protected path`
    );
  }
});

// The bullets of every list that sits under a heading, or after a bold lead, whose text starts with "Never".
function neverBullets(text) {
  const lines = text.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$/gm, "").split("\n");
  const bullets = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = /^#{1,6}\s+(.*)$/.exec(lines[i]);
    const bold = /^\s*(?:[-*+]\s+)?\*\*(.*?)\*\*/.exec(lines[i]);
    const lead = heading ? heading[1] : bold ? bold[1] : null;
    if (lead === null || !/^\s*`?Never\b/i.test(lead.replace(/[*_]/g, ""))) continue;
    const isHeading = Boolean(heading);
    const indent = /^\s*/.exec(lines[i])[0].length;
    let current = null;
    let seenBullet = false;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^#{1,6}\s/.test(l)) break;
      if (!isHeading && /^\s*\*\*/.test(l) && !/^\s*[-*+]\s/.test(l)) break;
      const item = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(l);
      if (item) {
        if (!isHeading && seenBullet && item[1].length < indent) break;
        seenBullet = true;
        current = item[2];
        bullets.push(current);
        continue;
      }
      if (l.trim() === "") {
        if (seenBullet && !isHeading) {
          const next = lines.slice(j + 1).find((x) => x.trim() !== "");
          if (next === undefined || !/^\s*(?:[-*+]|\d+[.)])\s/.test(next)) break;
        }
        current = null;
        continue;
      }
      if (current !== null && /^\s+\S/.test(l)) bullets[bullets.length - 1] += " " + l.trim();
      else if (seenBullet && !isHeading) break;
    }
  }
  return bullets;
}
