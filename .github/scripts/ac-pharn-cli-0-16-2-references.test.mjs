// Acceptance tests for pharn-cli-skill-0-16-2: the pharn-cli skill's references brought to PHARN CLI 0.16.x.
// AC-3, AC-8 and AC-11 (pharn/features/pharn-cli-skill-0-16-2/SPEC.md).
// Every file is read inside a test body, so a missing file is a failed test, never a file that will not load.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
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

// From the first heading matching startRe to the next heading of level <= maxEndLevel (default: its own level).
function section(lines, startRe, maxEndLevel) {
  const start = lines.findIndex((l) => headingLevel(l) > 0 && startRe.test(l.text));
  if (start < 0) return null;
  const stop = maxEndLevel ?? headingLevel(lines[start]);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const lv = headingLevel(lines[i]);
    if (lv > 0 && lv <= stop) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

// Passages: table rows, headings, list items (with their nested items) and paragraphs.
function units(lines) {
  const text = lines.filter((l) => !l.fenced).map((l) => l.text);
  const out = [];
  const n = text.length;
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
          let p = j + 1;
          while (p < n && text[p].trim() === "") p++;
          if (p < n && indent(text[p]) > k) continue;
          break;
        }
        if (isHeading(next)) break;
        if ((LIST_RE.test(next) || isTable(next)) && indent(next) <= k) break;
        parts.push(next);
      }
      out.push(norm(parts.join(" ")));
      continue;
    }
    const prev = i > 0 ? text[i - 1] : "";
    if (i > 0 && prev.trim() !== "" && !isHeading(prev) && !isTable(prev)) continue;
    const parts = [line];
    for (let j = i + 1; j < n; j++) {
      const next = text[j];
      if (next.trim() === "" || isHeading(next) || isTable(next) || LIST_RE.test(next)) break;
      parts.push(next);
    }
    out.push(norm(parts.join(" ")));
  }
  return out;
}

const allMatch = (s, patterns) => patterns.every((p) => (typeof p === "string" ? s.includes(p) : p.test(s)));
const word = (w) => new RegExp(`(?<![\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);

// A key is documented with its fields when one passage (a table row, a list item, a paragraph) names the key
// and every field, or when a heading names the key and its section names every field.
function documents(lines, key, fields) {
  const patterns = [word(key), ...fields.map(word)];
  if (units(lines).some((u) => allMatch(u, patterns))) return true;
  return lines.some((l, i) => {
    if (headingLevel(l) === 0 || !word(key).test(l.text)) return false;
    const sub = section(lines.slice(i), /./);
    return allMatch(norm(sub.map((x) => x.text).join("\n")), patterns);
  });
}

function updateSection() {
  const sec = section(scan(read(JSON_MD)), /pharn update --dry-run --json/, 2);
  assert.ok(sec, "json.md has its pharn update --dry-run --json section");
  return sec;
}

function statusSection() {
  const sec = section(scan(read(JSON_MD)), /pharn status --json/, 2);
  assert.ok(sec, "json.md has its pharn status --json section");
  return sec;
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

// ---- AC-3 ----

test("AC-3: json.md documents plan.gitignore with its fields, actions and refusal reasons, present only when .gitignore would change", () => {
  const sec = updateSection();
  const text = norm(sec.map((l) => l.text).join("\n"));
  assert.ok(text.includes("plan.gitignore"), "the update section names plan.gitignore");
  for (const field of ["action", "entries", "reason"]) assert.ok(word(field).test(text), `the update section names the field ${field}`);
  for (const value of ["create", "append", "refused", "symlink", "not-a-file", "unreadable"]) {
    assert.ok(word(value).test(text), `the update section names the value ${value}`);
  }
  const gitignoreSection = sec.findIndex((l) => headingLevel(l) > 0 && /gitignore/.test(l.text));
  const scope = gitignoreSection >= 0 ? section(sec.slice(gitignoreSection), /./) : sec;
  assert.ok(
    units(scope).some((u) => /\.gitignore/.test(u) && /\b(?:only\s+(?:when|if)|absent\s+when|omitted\s+when)\b/i.test(u)),
    "json.md says plan.gitignore is present only when .gitignore would change"
  );
});

// ---- AC-8 ----

test("AC-8: commands.md's table lists the init options, the rm alias of remove, and uninstall with --yes/-y only", () => {
  const lines = scan(read(COMMANDS_MD));
  const text = lines.filter((l) => !l.fenced).map((l) => l.text);
  const commandRow = (re) => text.find((l) => isTable(l) && re.test(cells(l)[0] ?? ""));

  const init = commandRow(/^`pharn init\b/);
  assert.ok(init, "commands.md has a pharn init row");
  for (const option of ["--ref", "--archetype", "--yes", "--dry-run", "--json"])
    assert.ok(word(option).test(init), `the init row lists ${option}`);
  assert.ok(/(?<![\w-])-y(?![\w-])/.test(init), "the init row lists -y");

  const remove = commandRow(/^`pharn (?:remove|rm)\b/);
  assert.ok(remove, "commands.md has a pharn remove row");
  assert.ok(/(?<![\w-])rm(?![\w-])/.test(remove), "the remove row names the rm alias");

  const uninstallIndex = text.findIndex((l) => isTable(l) && /^`pharn uninstall\b/.test(cells(l)[0] ?? ""));
  assert.ok(uninstallIndex >= 0, "commands.md has a pharn uninstall row");
  const row = cells(text[uninstallIndex]);
  let headerIndex = uninstallIndex;
  while (headerIndex > 0 && isTable(text[headerIndex - 1])) headerIndex--;
  const header = cells(text[headerIndex]);
  const optionColumn = header.findIndex((h) => /option|flag/i.test(h));
  const options = optionColumn > 0 ? (row[optionColumn] ?? "") : row.slice(1).join(" | ");
  assert.ok(/(?<![\w-])-y(?![\w-])/.test(options), "the uninstall row's options name -y");
  assert.deepEqual(
    [...new Set(options.match(/(?<![\w-])--[a-z][\w-]*/g) ?? [])],
    ["--yes"],
    `the uninstall row's only option is --yes/-y: ${options}`
  );
});

// ---- AC-11 ----

test("AC-11: json.md documents removals, orphans and absentUpstream in the update plan, and layout, orphans and drift.absentUpstream in status", () => {
  const update = updateSection();
  assert.ok(
    documents(update, "removals", ["role", "name", "reason", "dir", "present", "backups"]),
    "the update plan documents removals with role, name, reason, dir, present, backups"
  );
  assert.ok(
    documents(update, "orphans", ["path", "state", "unchanged", "edited", "unreadable", "reason"]),
    "the update plan documents orphans with path, state (unchanged, edited, unreadable) and reason"
  );
  assert.ok(documents(update, "absentUpstream", ["surface", "path"]), "the update plan documents absentUpstream with surface and path");

  const status = statusSection();
  const rows = status.filter((l) => !l.fenced && isTable(l.text)).map((l) => l.text);
  assert.ok(
    rows.some((r) => word("layout").test(cells(r)[0] ?? "") && allMatch(r, [word("recorded"), word("upstream")])),
    "the status table has a layout row naming recorded and upstream"
  );
  assert.ok(
    rows.some((r) => word("orphans").test(cells(r)[0] ?? "")),
    "the status table has an orphans row"
  );
  assert.ok(
    units(status).some((u) => /drift\.absentUpstream/.test(u) || (word("drift").test(u) && word("absentUpstream").test(u))),
    "the status section names absentUpstream under drift"
  );
});
