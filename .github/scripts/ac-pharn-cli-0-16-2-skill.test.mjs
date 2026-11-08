// Acceptance tests for pharn-cli-skill-0-16-2: the pharn-cli skill text brought to PHARN CLI 0.16.x.
// AC-1, AC-2, AC-4, AC-5, AC-6, AC-9, AC-10 and AC-12 (pharn/features/pharn-cli-skill-0-16-2/SPEC.md).
// Every file is read inside a test body, so a missing file is a failed test, never a file that will not load.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SKILL_DIR = path.join(ROOT, "plugins/pharn/skills/pharn-cli");
const SKILL = "plugins/pharn/skills/pharn-cli/SKILL.md";
const JSON_MD = "plugins/pharn/skills/pharn-cli/references/json.md";
const COMMANDS_MD = "plugins/pharn/skills/pharn-cli/references/commands.md";

const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

// ---- Markdown helpers (kept in this file: the writes-scope allows no shared helper file) ----

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const LIST_RE = /^(\s*)(?:[-*+]|\d+[.)])\s+/;
const isHeading = (s) => /^#{1,6}\s/.test(s);
const isTable = (s) => /^\s*\|/.test(s);
const indent = (s) => s.match(/^\s*/)[0].length;
const norm = (s) => s.replace(/\s+/g, " ").trim();

function frontmatterField(md, key) {
  const fm = md.match(FRONTMATTER_RE);
  if (!fm) return null;
  const lines = fm[1].split(/\r?\n/);
  const i = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (i < 0) return null;
  let value = lines[i].slice(key.length + 1).trim();
  if (value === "" || /^[>|][-+]?$/.test(value)) {
    const parts = [];
    for (let j = i + 1; j < lines.length && (/^\s/.test(lines[j]) || lines[j] === ""); j++) parts.push(lines[j].trim());
    value = parts.join(" ");
  } else {
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) value += ` ${lines[j].trim()}`;
  }
  if (/^'[\s\S]*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'");
  if (/^"[\s\S]*"$/.test(value)) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

// The body's lines (frontmatter dropped), each marked whether it sits inside a fenced code block.
function scan(md) {
  const lines = [];
  let fence = null;
  for (const text of md.replace(FRONTMATTER_RE, "").split(/\r?\n/)) {
    const m = text.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      lines.push({ text, fenced: true });
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      lines.push({ text, fenced: true });
      continue;
    }
    lines.push({ text, fenced: false });
  }
  return lines;
}

const headingLevel = (l) => (l.fenced ? 0 : (l.text.match(/^(#{1,6})\s/)?.[1].length ?? 0));

// From the first heading matching startRe to the next heading of the same or a higher level, or to a
// heading matching endRe, whichever comes first. Null when no heading matches startRe.
function section(lines, startRe, endRe) {
  const start = lines.findIndex((l) => headingLevel(l) > 0 && startRe.test(l.text));
  if (start < 0) return null;
  const level = headingLevel(lines[start]);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const lv = headingLevel(lines[i]);
    if (lv > 0 && (lv <= level || (endRe && endRe.test(lines[i].text)))) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

// Passages: table rows, headings, list items and paragraphs. A list item carries its nested items unless
// `atomic`; a paragraph ending in ":" carries the list it introduces unless `atomic`.
function units(lines, { atomic = false } = {}) {
  const text = lines.filter((l) => !l.fenced).map((l) => l.text);
  const out = [];
  const n = text.length;
  const nextNonBlank = (from) => {
    let p = from;
    while (p < n && text[p].trim() === "") p++;
    return p;
  };
  for (let i = 0; i < n; i++) {
    const line = text[i];
    if (line.trim() === "") continue;
    if (isTable(line)) {
      out.push(norm(line));
      continue;
    }
    if (isHeading(line)) {
      out.push(norm(line.replace(/^#+\s*/, "")));
      continue;
    }
    const m = line.match(LIST_RE);
    if (m) {
      const k = m[1].length;
      const parts = [line];
      for (let j = i + 1; j < n; j++) {
        const next = text[j];
        if (next.trim() === "") {
          const p = nextNonBlank(j + 1);
          if (!atomic && p < n && indent(text[p]) > k) continue;
          break;
        }
        if (isHeading(next)) break;
        const isList = LIST_RE.test(next);
        if (isList && (atomic || indent(next) <= k)) break;
        if (isTable(next) && indent(next) <= k) break;
        parts.push(next);
      }
      out.push(norm(parts.join(" ")));
      continue;
    }
    const prev = i > 0 ? text[i - 1] : "";
    if (i > 0 && prev.trim() !== "" && !isHeading(prev) && !isTable(prev)) continue;
    const parts = [line];
    let j = i + 1;
    for (; j < n; j++) {
      const next = text[j];
      if (next.trim() === "" || isHeading(next) || isTable(next) || LIST_RE.test(next)) break;
      parts.push(next);
    }
    if (!atomic && /:\s*$/.test(parts[parts.length - 1])) {
      const p = nextNonBlank(j);
      if (p < n && LIST_RE.test(text[p])) {
        const k = indent(text[p]);
        for (let q = p; q < n; q++) {
          const next = text[q];
          if (next.trim() === "") {
            const r = nextNonBlank(q + 1);
            if (r < n && indent(text[r]) >= k && (indent(text[r]) > k || LIST_RE.test(text[r]))) continue;
            break;
          }
          if (isHeading(next)) break;
          parts.push(next);
        }
      }
    }
    out.push(norm(parts.join(" ")));
  }
  return out;
}

// Sentences of the atomic passages; table cells are split apart first.
function sentences(lines) {
  return units(lines, { atomic: true })
    .flatMap((u) => u.split(/\s\|\s/))
    .flatMap((u) => u.split(/(?<=[.!?])\s+(?=[-A-Z`*_("'[])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

const allMatch = (s, patterns) => patterns.every((p) => (typeof p === "string" ? s.includes(p) : p.test(s)));
const findUnit = (list, patterns) => list.find((u) => allMatch(u, patterns));

function skillSection3(lines) {
  return (
    section(lines, /^#{1,6}\s+(?:(?:Step|Section)\s+)?3\b/i, /root layout migration/i) ??
    section(lines, /^#{1,6}\s+.*\bupdat/i, /root layout migration/i)
  );
}

function neverBullets(lines) {
  const never = section(lines, /^#{1,6}\s+Never\b/i);
  if (!never) return [];
  return units(never).filter((u) => LIST_RE.test(u));
}

function markdownFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...markdownFiles(full));
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

// ---- AC-1 ----

test("AC-1: the skill description and the README pharn rows say best on 0.16.0, not 0.14.0", () => {
  const description = frontmatterField(read(SKILL), "description");
  assert.equal(typeof description, "string", "SKILL.md has a frontmatter description");
  assert.ok(description.includes("best on 0.16.0"), `description names best on 0.16.0: ${description}`);
  assert.ok(!description.includes("best on 0.14.0"), "description no longer says best on 0.14.0");
  assert.ok(description.includes("0.10.0+"), "description still names 0.10.0+");
  assert.ok(description.includes("0.9.x"), "description still names the 0.9.x fallback");

  const rows = read("README.md")
    .split(/\r?\n/)
    .filter((l) => /best on/.test(l) && (/\bpharn-cli\b/.test(l) || /@pharn-dev\/pharn(?![-\w])/.test(l)));
  assert.ok(rows.length >= 1, "README.md has pharn rows that name a best-supported CLI");
  for (const row of rows) {
    assert.ok(row.includes("best on 0.16.0"), `README row says best on 0.16.0: ${row}`);
    assert.ok(!row.includes("best on 0.14.0"), `README row no longer says best on 0.14.0: ${row}`);
  }
});

// ---- AC-2 ----

const NEVER_EDITS_CLAIMS = [
  /\b(?:CLI|pharn)\b.*\bnever\s+(?:edits|writes|touches|modifies|changes)\b.*\.gitignore/i,
  /\.gitignore`?\s+(?:is|are)\s+never\s+(?:edited|written|touched|modified|changed)\b/i,
];

test("AC-2: no skill file says the CLI never edits .gitignore, and SKILL.md and json.md say 0.16.0 init and update append the two lines", () => {
  const files = markdownFiles(SKILL_DIR);
  assert.ok(files.length >= 3, "the skill directory holds SKILL.md and its references");
  for (const file of files) {
    for (const sentence of sentences(scan(readFileSync(file, "utf8")))) {
      for (const claim of NEVER_EDITS_CLAIMS) {
        assert.ok(!claim.test(sentence), `${path.relative(ROOT, file)} still says .gitignore is never edited: ${sentence}`);
      }
    }
  }
  for (const rel of [SKILL, JSON_MD]) {
    const hit = sentences(scan(read(rel))).find((s) =>
      allMatch(s, ["0.16.0", /\binit\b/, /\bupdate\b/, "pharn/.run/", "pharn/.backup/", ".gitignore", /\b(?:append|add)/i])
    );
    assert.ok(hit, `${rel} has a sentence saying CLI 0.16.0+ init and update append pharn/.run/ and pharn/.backup/ to .gitignore`);
  }
});

// ---- AC-4 ----

test("AC-4: the update flow explains plan.gitignore, the same-version planned dry run, git status, and the refused case", () => {
  const sec = skillSection3(scan(read(SKILL)));
  assert.ok(sec, "SKILL.md has its update-flow section");
  const text = norm(sec.map((l) => l.text).join("\n"));
  const passages = units(sec);
  assert.ok(text.includes("plan.gitignore"), "the update flow names plan.gitignore");
  assert.ok(
    findUnit(passages, [".gitignore", /\bplanned\b/, /\bsame\b/i, /\bversion\b/i]),
    "a passage says a .gitignore missing a line makes the dry run planned at the same skills version"
  );
  assert.ok(findUnit(passages, ["git status --short", ".gitignore"]), "a passage says git status --short shows .gitignore changed");
  assert.ok(
    findUnit(passages, [/\.gitignore|\blines\b/, /left\s+to\s+the\s+CLI|let\s+the\s+CLI|CLI\s+(?:itself\s+)?(?:adds|appends|will\s+add)/i]),
    "a passage says adding the lines is left to the CLI"
  );
  assert.ok(
    findUnit(passages, [/\brefused\b/, /\.gitignore/, /\bperson\b/i, /\btext\b/i, /\bnever\b[\s\S]*\bedit(?:s|ing)?\b[\s\S]*\.gitignore/i]),
    "a passage says a refused plan.gitignore leaves the lines for the person, given as text, never by the agent editing .gitignore"
  );
});

// ---- AC-5 ----

test("AC-5: the root layout migration leaves only pharn/.lock* to paste on 0.16.0+, and json.md's gitignoreHints row says why", () => {
  const sec = section(scan(read(SKILL)), /root layout migration/i);
  assert.ok(sec, "SKILL.md has its Root layout migration section");
  const passages = units(sec);
  assert.ok(
    findUnit(passages, ["0.16.0", "pharn/.run/", "pharn/.backup/", /\bCLI\s+itself\b|\bCLI\s+(?:adds|appends)\b/i]),
    "a passage says on 0.16.0+ the CLI itself adds pharn/.run/ and pharn/.backup/"
  );
  assert.ok(
    findUnit(passages, ["gitignoreHints", "pharn/.lock*", /\bonly\b/i, /\bpaste\b/i]),
    "a passage says only pharn/.lock* of gitignoreHints is left for the person to paste"
  );

  const rows = read(JSON_MD)
    .split(/\r?\n/)
    .filter((l) => isTable(l) && l.includes("gitignoreHints"));
  assert.ok(rows.length >= 1, "json.md has a gitignoreHints table row");
  assert.ok(
    rows.some((r) => allMatch(r, ["0.16.0", "pharn/.run/", "pharn/.backup/", /\bCLI\b/])),
    "json.md's gitignoreHints row names 0.16.0 and the two lines the CLI adds"
  );
});

// ---- AC-6 ----

test("AC-6: a bare pharn runs init, init --yes and --dry-run run without a terminal and are still never run, and no TTY reason remains", () => {
  const all = sentences(scan(read(SKILL)));
  assert.ok(
    all.some(
      (s) =>
        /\binit\b/.test(s) &&
        /\bruns?\b/.test(s) &&
        (/\bbare\s+`?pharn`?/i.test(s) || /`pharn`\s+(?:with\s+no|without\s+a(?:ny)?)\s+(?:sub)?command/i.test(s))
    ),
    "a sentence says a bare pharn with no command runs init"
  );
  assert.ok(
    all.some((s) => allMatch(s, [/\binit\b/, "--yes", "--dry-run", /without\s+a\s+terminal/i, /\bnever\b/i])),
    "a sentence names init --yes and --dry-run as running without a terminal and still never run"
  );
  for (const s of all.filter((x) => /\binit\b/.test(x))) {
    assert.ok(!/interactive/i.test(s), `a sentence about init still gives "interactive": ${s}`);
    assert.ok(!/\bTTY\b/i.test(s), `a sentence about init still names a TTY: ${s}`);
    assert.ok(!/refuses?\s+without\s+a\s+terminal/i.test(s), `a sentence about init still says it refuses without a terminal: ${s}`);
  }
});

// ---- AC-9 ----

test("AC-9: SKILL.md and commands.md explain the 0.15.0 release channel and its refusal; SKILL.md never switches it unasked", () => {
  for (const rel of [SKILL, COMMANDS_MD]) {
    const lines = scan(read(rel));
    const passages = units(lines);
    const text = norm(lines.map((l) => l.text).join("\n"));
    assert.ok(
      findUnit(passages, ["0.15.0", /verified\s+releases?/i, /\blatest\b/, /\bdefault\b/i]),
      `${rel} says since 0.15.0 a new install follows verified releases (latest) by default`
    );
    assert.ok(
      text.includes("Could not resolve the latest verified pharn-dev/pharn-oss release"),
      `${rel} names the refusal's stderr start`
    );
    assert.ok(
      findUnit(passages, ["api.github.com", /rate\s+limit|requests\s+an\s+hour/i]),
      `${rel} names the api.github.com rate limit behind the refusal`
    );
  }
  const lines = scan(read(SKILL));
  const refRule = [/--ref\b/, /\bchannel\b/i, /\b(?:unless|only\s+(?:when|if))\b/i, /\bask/i];
  assert.ok(
    sentences(lines).some((s) => /\bnever\b/i.test(s) && allMatch(s, refRule)) || neverBullets(lines).some((b) => allMatch(b, refRule)),
    "SKILL.md says never to pass --ref to switch the channel unless the person asks"
  );
});

// ---- AC-10 ----

test("AC-10: SKILL.md never runs pharn uninstall, leaves it to the person in their own terminal, and lists it under Never", () => {
  const lines = scan(read(SKILL));
  const passages = units(lines);
  const bullets = neverBullets(lines);
  assert.ok(
    sentences(lines).some((s) => allMatch(s, [/\bnever\b/i, "pharn uninstall", /in\s+any\s+form/i])) ||
      bullets.some((b) => allMatch(b, ["pharn uninstall", /in\s+any\s+form/i])),
    "SKILL.md says never to run pharn uninstall in any form"
  );
  assert.ok(
    findUnit(passages, [/uninstall/i, /person['’]s\s+(?:job|decision|call|to\s+do)|theirs\s+to\s+(?:do|run)/i]),
    "SKILL.md says uninstalling PHARN is the person's job"
  );
  assert.ok(
    findUnit(passages, ["pharn uninstall", /\btheir\s+own\s+terminal\b/i]),
    "SKILL.md tells the person to run pharn uninstall in their own terminal"
  );
  assert.ok(bullets.length > 0, "SKILL.md has a Never list");
  assert.ok(
    bullets.some((b) => b.includes("pharn uninstall")),
    "a bullet of the Never list names pharn uninstall"
  );
});

// ---- AC-12 ----

test("AC-12: before pharn update --yes the agent names the removals the update deletes and the orphans left to the person", () => {
  const sec = skillSection3(scan(read(SKILL)));
  assert.ok(sec, "SKILL.md has its update-flow section");
  assert.ok(
    findUnit(units(sec), [
      /\bbefore\b/i,
      "pharn update --yes",
      "plan.capabilities.removals",
      /\bdelet/i,
      "plan.orphans",
      /\bperson\b|\bthem\b/i,
    ]),
    "a passage names pharn update --yes, plan.capabilities.removals with the directories it deletes, and plan.orphans left for the person to delete"
  );
});
