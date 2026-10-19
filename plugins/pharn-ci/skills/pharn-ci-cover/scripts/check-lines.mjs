#!/usr/bin/env node
// Re-check the added lines a pharn-ci report (Report v1) lists as uncovered against a fresh
// coverage report, and estimate the new diff coverage. Node core only; reads files and runs
// read-only git commands, writes nothing.
//
//   node check-lines.mjs --report <report.json> --coverage <file> [--coverage <file>]...
//                        [--base <ref>] [--coverage-root <dir>] [--format lcov|cobertura|auto]
//
// Prints one JSON object on stdout; exit 0. Usage and input errors: message on stderr, exit 2.
// With --base, the added lines come from `git diff <base>...HEAD` exactly as pharn-ci reads them, so
// the estimate is recomputed from the diff and lines that lost coverage are found; without it, the
// estimate assumes every line the report counted as covered still is.
// When git cannot run (missing, or blocked by a sandbox), the directory holding .git is taken as the
// repository root and files on disk stand in for tracked files; the output says so ("git": false).
// This is an estimate for the person's own check run, not a replacement for pharn-ci.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const USAGE =
  "usage: check-lines.mjs --report <report.json> --coverage <file> [--coverage <file>]... [--base <ref>] [--coverage-root <dir>] [--format lcov|cobertura|auto]";

// Built from code points: these are invisible in source, and a literal one is easy to lose in an edit.
const BOM = String.fromCharCode(0xfeff);
const REPLACEMENT = String.fromCharCode(0xfffd);
const LINE_TERMINATORS = ["\n", "\r", String.fromCharCode(0x2028), String.fromCharCode(0x2029)];

export class UsageError extends Error {}

export function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        report: { type: "string" },
        coverage: { type: "string", multiple: true },
        base: { type: "string" },
        "coverage-root": { type: "string" },
        format: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (err) {
    throw new UsageError(`${err.message}\n${USAGE}`);
  }
  const v = parsed.values;
  if (v.help) return { help: true };
  if (!v.report) throw new UsageError(`--report is required\n${USAGE}`);
  if (!v.coverage || v.coverage.length === 0) throw new UsageError(`--coverage is required\n${USAGE}`);
  const format = v.format ?? "auto";
  if (!["lcov", "cobertura", "auto"].includes(format)) {
    throw new UsageError(`--format must be lcov, cobertura or auto, got "${format}"`);
  }
  const root = v["coverage-root"];
  if (root !== undefined && (path.isAbsolute(root) || root.split(/[\\/]/).includes("..") || root.startsWith("-"))) {
    throw new UsageError("--coverage-root must be repo-relative: not absolute, no '..', not starting with '-'");
  }
  if (v.base !== undefined && (v.base === "" || v.base.startsWith("-") || v.base.includes("\0"))) {
    throw new UsageError("--base must be a ref or commit, not empty and not starting with '-'");
  }
  return { report: v.report, coverage: v.coverage, coverageRoot: root ?? "", format, base: v.base ?? null };
}

/** A repo-relative path git can take as a pathspec: not empty, not absolute, no '..' segment, no NUL. */
export function isSafeRepoPath(p) {
  if (typeof p !== "string" || p === "" || p.includes("\0")) return false;
  if (p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith("\\")) return false;
  return !p.split(/[\\/]/).includes("..");
}

/** Validate the parts of Report v1 this helper reads. Throws UsageError on anything else. */
export function readReport(text) {
  let r;
  try {
    r = JSON.parse(text);
  } catch (err) {
    throw new UsageError(`the report is not JSON: ${err.message}`);
  }
  if (r === null || typeof r !== "object" || r.schemaVersion !== "1" || r.tool?.name !== "pharn-ci") {
    throw new UsageError('the report is not a pharn-ci Report v1 (schemaVersion "1", tool.name "pharn-ci")');
  }
  const dc = r.diffCoverage;
  if (dc === null || dc === undefined) {
    throw new UsageError("the report has no diff coverage (diffCoverage is null); its messages say why, so there are no lines to check");
  }
  const isCount = (n) => Number.isInteger(n) && n >= 0;
  if (!isCount(dc.coveredLines) || !isCount(dc.coverableLines) || !Array.isArray(dc.files)) {
    throw new UsageError("the report's diffCoverage is malformed");
  }
  const files = [];
  const invalidPaths = [];
  for (const f of dc.files) {
    if (typeof f?.path !== "string" || f.path === "" || !Array.isArray(f.uncoveredLines)) {
      throw new UsageError("the report's diffCoverage.files is malformed");
    }
    if (!isSafeRepoPath(f.path)) {
      invalidPaths.push(f.path);
      continue;
    }
    const lines = f.uncoveredLines.filter((n) => Number.isInteger(n) && n >= 1);
    files.push({
      path: f.path,
      lines: [...new Set(lines)].sort((a, b) => a - b),
      coverableLines: isCount(f.coverableLines) ? f.coverableLines : null,
    });
  }
  const excluded = Array.isArray(dc.excludedFiles) ? dc.excludedFiles.filter((p) => typeof p === "string") : [];
  return {
    tool: `${r.tool.name} ${typeof r.tool.version === "string" ? r.tool.version : "?"}`,
    verdict: r.verdict,
    percent: dc.percent ?? null,
    threshold: typeof dc.threshold === "number" && Number.isFinite(dc.threshold) ? dc.threshold : null,
    coveredLines: dc.coveredLines,
    coverableLines: dc.coverableLines,
    files,
    excludedFiles: new Set(excluded),
    invalidPaths,
  };
}

export function detectFormat(text) {
  const head = (text.startsWith(BOM) ? text.slice(1) : text).slice(0, 1024).trimStart();
  if (head.startsWith("TN:") || head.startsWith("SF:")) return "lcov";
  if (head.startsWith("<") && /<coverage[\s>]/.test(head) && !/<coverage[^>]*\sclover=/.test(head)) return "cobertura";
  return null;
}

/** lcov: [{ file, line, hits }] plus the count of malformed DA records. */
export function parseLcov(text) {
  const records = [];
  let skipped = 0;
  let file = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) file = line.slice(3);
    else if (line === "end_of_record") file = null;
    else if (line.startsWith("DA:")) {
      const [n, h] = line.slice(3).split(",");
      const num = Number(n);
      const hits = Number(h);
      if (file === null || !/^\d+$/.test(n ?? "") || num < 1 || h === undefined || h === "" || !Number.isFinite(hits) || hits < 0) {
        skipped++;
        continue;
      }
      records.push({ file, line: num, hits });
    }
  }
  return { records, skipped, sources: [] };
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) => {
    if (e[0] !== "#") return ENTITIES[e];
    const cp = e[1] === "x" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : REPLACEMENT;
  });
}

function attr(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs);
  return m === null ? undefined : decodeXml(m[2] ?? m[3] ?? "");
}

/** Cobertura: class-level <line> records (not those under <methods>), plus the <source> entries. */
export function parseCobertura(text) {
  const body = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  const sources = [];
  for (const m of body.matchAll(/<source>([^<]*)<\/source>/g)) {
    const s = decodeXml(m[1]).trim();
    if (s !== "") sources.push(s);
  }
  const records = [];
  let skipped = 0;
  let file = null;
  let inMethods = 0;
  for (const m of body.matchAll(/<(\/?)(class|methods|line)\b([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, selfClose] = m;
    if (tag === "class") {
      if (close) file = null;
      else file = selfClose ? null : (attr(attrs, "filename") ?? null);
    } else if (tag === "methods") {
      if (close) inMethods = Math.max(0, inMethods - 1);
      else if (!selfClose) inMethods++;
    } else if (!close && file !== null && inMethods === 0) {
      const n = attr(attrs, "number");
      const h = attr(attrs, "hits");
      const num = Number(n);
      const hits = h === undefined ? 0 : Number(h);
      if (!/^\d+$/.test(n ?? "") || num < 1 || !Number.isFinite(hits) || hits < 0) {
        skipped++;
        continue;
      }
      records.push({ file, line: num, hits });
    }
  }
  return { records, skipped, sources };
}

// --- unified diff reader --------------------------------------------------------------------------
// A port of pharn-ci 0.1.0's packages/core/src/diff/unified.ts (Apache-2.0), so the added lines here are
// the ones pharn-ci counts: renames, C-quoted paths, tab suffixes, /dev/null, binary files and hunk
// line counting included.

const HUNK_HEADER = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const ESCAPES = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 };

/** Undo git's C-style path quoting (core.quotePath), decoding octal UTF-8 bytes. */
export function unquote(value) {
  if (!(value.length >= 2 && value.startsWith('"') && value.endsWith('"'))) return value;
  const body = value.slice(1, -1);
  let encoded = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\\") {
      encoded += encodeURIComponent(ch);
      continue;
    }
    const octal = /^[0-7]{3}/.exec(body.slice(i + 1))?.[0];
    const next = body[i + 1] ?? "";
    let byte = 92;
    if (octal) {
      byte = Number.parseInt(octal, 8);
      i += 3;
    } else if (next in ESCAPES) {
      byte = ESCAPES[next];
      i += 1;
    }
    encoded += `%${byte.toString(16).padStart(2, "0")}`;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return body;
  }
}

function stripTabSuffix(raw) {
  let lastBreak = -1;
  for (const terminator of LINE_TERMINATORS) lastBreak = Math.max(lastBreak, raw.lastIndexOf(terminator));
  const tab = raw.indexOf("\t", lastBreak + 1);
  return tab === -1 ? raw : raw.slice(0, tab);
}

function stripPrefix(p) {
  const slash = p.indexOf("/");
  return slash === -1 ? p : p.slice(slash + 1);
}

function parseMarkerPath(raw) {
  const value = unquote(stripTabSuffix(raw));
  if (value === "/dev/null") return null;
  return stripPrefix(value);
}

function closingQuote(s) {
  for (let i = 1; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === '"') return i;
  }
  return -1;
}

function parseGitHeader(rest) {
  if (rest.startsWith('"')) {
    const end = closingQuote(rest);
    if (end === -1) return null;
    return { oldPath: stripPrefix(unquote(rest.slice(0, end + 1))), newPath: stripPrefix(unquote(rest.slice(end + 2))) };
  }
  const half = (rest.length - 1) / 2;
  if (Number.isInteger(half) && rest[half] === " ") {
    const a = stripPrefix(rest.slice(0, half));
    const b = stripPrefix(rest.slice(half + 1));
    if (a === b) return { oldPath: a, newPath: b };
  }
  const split = rest.lastIndexOf(" b/");
  if (split === -1) return null;
  return { oldPath: stripPrefix(rest.slice(0, split)), newPath: stripPrefix(rest.slice(split + 1)) };
}

/** `git diff --unified=0` text to [{ path, oldPath, status, addedLines, binary? }], as pharn-ci reads it. */
export function parseUnifiedDiff(text) {
  const entries = [];
  let current;
  let oldRemaining = 0;
  let newRemaining = 0;
  let cursor = 0;
  const start = () => {
    current = { oldPath: null, newPath: null, status: "modified", addedLines: [], sawHunk: false, binary: false };
    entries.push(current);
    return current;
  };
  for (const line of text.split(/\r?\n/)) {
    if (current && (oldRemaining > 0 || newRemaining > 0)) {
      const marker = line[0];
      if (marker === "+") {
        current.addedLines.push(cursor++);
        newRemaining--;
        continue;
      }
      if (marker === "-") {
        oldRemaining--;
        continue;
      }
      if (marker === " ") {
        cursor++;
        oldRemaining--;
        newRemaining--;
        continue;
      }
      if (marker === "\\") continue;
      oldRemaining = 0;
      newRemaining = 0;
    }
    if (line.startsWith("\\")) continue;
    if (line.startsWith("diff --git ")) {
      const entry = start();
      const header = parseGitHeader(line.slice("diff --git ".length));
      if (header) {
        entry.oldPath = header.oldPath;
        entry.newPath = header.newPath;
      }
    } else if (line.startsWith("new file mode")) {
      if (current) current.status = "added";
    } else if (line.startsWith("deleted file mode")) {
      if (current) current.status = "deleted";
    } else if (line.startsWith("rename from ")) {
      if (current) {
        current.status = "renamed";
        current.oldPath = unquote(line.slice("rename from ".length));
      }
    } else if (line.startsWith("rename to ")) {
      if (current) {
        current.status = "renamed";
        current.newPath = unquote(line.slice("rename to ".length));
      }
    } else if (line.startsWith("--- ")) {
      const entry = !current || current.sawHunk ? start() : current;
      const p = parseMarkerPath(line.slice(4));
      if (p === null) entry.status = "added";
      else entry.oldPath = p;
    } else if (line.startsWith("+++ ")) {
      const entry = current ?? start();
      const p = parseMarkerPath(line.slice(4));
      if (p === null) entry.status = "deleted";
      else entry.newPath = p;
    } else if ((line.startsWith("Binary files ") && line.endsWith(" differ")) || line === "GIT binary patch") {
      if (current) current.binary = true;
    } else if (line.startsWith("@@ ")) {
      const match = HUNK_HEADER.exec(line);
      if (!match || !current) continue;
      current.sawHunk = true;
      oldRemaining = match[1] === undefined ? 1 : Number(match[1]);
      cursor = Number(match[2]);
      newRemaining = match[3] === undefined ? 1 : Number(match[3]);
    }
  }
  const files = [];
  for (const e of entries) {
    const p = e.status === "deleted" ? (e.oldPath ?? e.newPath) : (e.newPath ?? e.oldPath);
    if (p === null) continue;
    files.push({
      path: p,
      oldPath: e.oldPath ?? p,
      status: e.status,
      addedLines: e.status === "deleted" ? [] : [...new Set(e.addedLines)].sort((a, b) => a - b),
      ...(e.binary ? { binary: true } : {}),
    });
  }
  return files;
}

// --- percent and threshold, as pharn-ci 0.1.0 computes them (packages/core/src/diffCoverage.ts) ----

/** Percent rounded to 2 decimals; 100 and 0 are reserved for exactly all / none covered. */
export function percentOf(covered, total, round = Math.round) {
  if (total === 0) return null;
  const rounded = round((covered * 10000) / total) / 100;
  return Math.min(Math.max(rounded, covered > 0 ? 0.01 : 0), covered < total ? 99.99 : 100);
}

/** Exactly whether covered / total >= threshold / 100, reading the threshold as the decimal it was written as. */
export function atLeast(covered, total, threshold) {
  const m = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(threshold));
  if (m === null) return covered * 100 >= threshold * total;
  const fraction = m[2] ?? "";
  const scale = fraction.length - Number(m[3] ?? 0);
  const digits = BigInt(`${m[1]}${fraction}`);
  const left = BigInt(covered) * 100n * 10n ** BigInt(Math.max(scale, 0));
  const right = digits * BigInt(total) * 10n ** BigInt(Math.max(-scale, 0));
  return left >= right;
}

/** The estimate block: Report v1's percent rules, and whether the threshold is met. */
export function estimateOf(covered, coverable, threshold, basis) {
  const meets = threshold === null ? null : coverable === 0 || atLeast(covered, coverable, threshold);
  let percent = percentOf(covered, coverable);
  if (meets === false && percent !== null && percent >= threshold) percent = percentOf(covered, coverable, Math.floor);
  return { coveredLines: covered, coverableLines: coverable, percent, threshold, meetsThreshold: meets, basis };
}

// --- comparison -----------------------------------------------------------------------------------

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

/** A repo-relative POSIX path for a coverage path, or null when it lies outside the repo. */
function repoRelative(repoRoot, absolute) {
  const rel = toPosix(path.relative(repoRoot, absolute));
  if (rel === "" || rel === ".." || rel.startsWith("../") || path.isAbsolute(rel)) return null;
  return rel;
}

/**
 * Resolve a coverage file's paths to tracked repo-relative paths, once per distinct path. Relative lcov
 * paths start at the coverage root (default: the repo root). Relative Cobertura filenames are joined to
 * each <source> in order and the first tracked result wins, as pharn-ci does; with no usable source,
 * the coverage root applies. Returns null for a path that is not a tracked file.
 */
function makeResolver(sources, { repoRoot, coverageRoot, tracked }) {
  const cache = new Map();
  return (file) => {
    if (cache.has(file)) return cache.get(file);
    const f = toPosix(file);
    let rel = null;
    if (path.isAbsolute(f) || /^[A-Za-z]:\//.test(f)) {
      rel = repoRelative(repoRoot, f);
    } else {
      const candidates = [];
      for (const s of sources) {
        const src = toPosix(s);
        candidates.push(path.isAbsolute(src) ? path.join(src, f) : path.join(repoRoot, coverageRoot, src, f));
      }
      candidates.push(path.join(repoRoot, coverageRoot, f));
      const rels = candidates.map((c) => repoRelative(repoRoot, c)).filter((r) => r !== null);
      rel = rels.find((r) => tracked.has(r)) ?? rels[0] ?? null;
    }
    const result = rel !== null && tracked.has(rel) ? rel : null;
    cache.set(file, result);
    return result;
  };
}

function groupByPath(entries) {
  const byPath = new Map();
  for (const { path: p, line } of entries) {
    if (!byPath.has(p)) byPath.set(p, []);
    byPath.get(p).push(line);
  }
  return [...byPath].map(([p, lines]) => ({ path: p, lines }));
}

const key = (p, line) => `${p}\n${line}`;

/**
 * The comparison itself, on plain data. `diff` is the parsed `<base>...HEAD` diff, or null: with it the
 * estimate is recomputed from the added lines (pharn-ci's own rule), without it the report's covered
 * count is taken as still true. Only the lines asked about are kept from the coverage records.
 */
export function compare(report, coverageFiles, { repoRoot, coverageRoot, tracked, diff = null }) {
  const measured = diff === null ? [] : diff.filter((f) => f.status !== "deleted" && !report.excludedFiles.has(f.path));
  const wanted = new Set();
  for (const f of report.files) for (const line of f.lines) wanted.add(key(f.path, line));
  for (const f of measured) for (const line of f.addedLines) wanted.add(key(f.path, line));

  const hits = new Map();
  const coveragePaths = new Set();
  const unmatched = new Set();
  let skipped = 0;
  for (const cf of coverageFiles) {
    skipped += cf.parsed.skipped;
    const resolve = makeResolver(cf.parsed.sources, { repoRoot, coverageRoot, tracked });
    for (const rec of cf.parsed.records) {
      const p = resolve(rec.file);
      if (p === null) {
        unmatched.add(rec.file);
        continue;
      }
      coveragePaths.add(p);
      const k = key(p, rec.line);
      if (wanted.has(k)) hits.set(k, (hits.get(k) ?? 0) + rec.hits);
    }
  }

  const nowCovered = [];
  const stillUncovered = [];
  const notInCoverage = [];
  for (const f of report.files) {
    for (const line of f.lines) {
      const h = hits.get(key(f.path, line));
      if (h === undefined) notInCoverage.push({ path: f.path, line });
      else if (h > 0) nowCovered.push({ path: f.path, line });
      else stillUncovered.push({ path: f.path, line });
    }
  }

  let estimate;
  let notAdded = null;
  let regressed = null;
  let coverableMismatch = null;
  if (diff === null) {
    const covered = Math.min(report.coverableLines, report.coveredLines + nowCovered.length);
    estimate = estimateOf(covered, report.coverableLines, report.threshold, "listed-lines");
  } else {
    const added = new Map(measured.map((f) => [f.path, new Set(f.addedLines)]));
    notAdded = groupByPath(report.files.flatMap((f) => f.lines.filter((line) => !added.get(f.path)?.has(line)).map((line) => ({ path: f.path, line }))));
    const local = new Map();
    let covered = 0;
    let coverable = 0;
    for (const f of measured) {
      let fileCovered = 0;
      const uncovered = [];
      for (const line of f.addedLines) {
        const h = hits.get(key(f.path, line));
        if (h === undefined) continue;
        if (h > 0) fileCovered++;
        else uncovered.push(line);
      }
      const fileCoverable = fileCovered + uncovered.length;
      if (fileCoverable === 0) continue;
      covered += fileCovered;
      coverable += fileCoverable;
      local.set(f.path, { coverable: fileCoverable, uncovered });
    }
    estimate = estimateOf(covered, coverable, report.threshold, "added-lines");
    const reported = new Map(report.files.map((f) => [f.path, f]));
    coverableMismatch = [];
    regressed = [];
    for (const p of [...new Set([...reported.keys(), ...local.keys()])].sort()) {
      const r = reported.get(p);
      const l = local.get(p);
      const reportCount = r?.coverableLines ?? null;
      const localCount = l?.coverable ?? 0;
      if (r === undefined || reportCount !== localCount) {
        coverableMismatch.push({ path: p, report: r === undefined ? 0 : reportCount, local: localCount });
        continue;
      }
      const listed = new Set(r.lines);
      for (const line of l?.uncovered ?? []) if (!listed.has(line)) regressed.push({ path: p, line });
    }
    regressed = groupByPath(regressed);
  }

  return {
    coverage: {
      paths: coveragePaths.size,
      unmatchedPaths: unmatched.size,
      ...(unmatched.size > 0 ? { unmatchedExample: [...unmatched][0] } : {}),
      linesSkipped: skipped,
    },
    lines: {
      checked: nowCovered.length + stillUncovered.length + notInCoverage.length,
      nowCovered: groupByPath(nowCovered),
      stillUncovered: groupByPath(stillUncovered),
      notInCoverage: groupByPath(notInCoverage),
      notAdded,
      regressed,
    },
    coverableMismatch,
    estimate,
  };
}

// --- git ----------------------------------------------------------------------------------------

function realGit(cwd, args) {
  return execFileSync("git", ["--literal-pathspecs", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
    timeout: 120_000,
  });
}

/** git's first non-empty stderr line, or the error's own message. */
function gitMessage(err) {
  const line = String(err?.stderr ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l !== "");
  return line ?? (err?.code ? `${err.code}` : String(err?.message ?? err));
}

/** True when git itself could not run: missing, not executable, or blocked by a sandbox (macOS xcrun cache). */
export function gitCannotRun(err) {
  if (["ENOENT", "EACCES", "EPERM"].includes(err?.code)) return true;
  const stderr = String(err?.stderr ?? "");
  return /couldn't create cache file|xcrun: error|xcode-select/.test(stderr) && !/not a git repository/i.test(stderr);
}

/** The nearest directory at or above `cwd` that holds a .git entry (directory or file), or null. */
export function findGitRoot(cwd) {
  let dir = path.resolve(cwd);
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The repository root and how to tell whether a repo-relative path is a real file. When git cannot run,
 * the directory holding .git stands in for the root and files on disk for tracked files. Any other git
 * failure is an error, so a broken repository is never mistaken for a missing git.
 */
function locateRepo(cwd, git) {
  try {
    const repoRoot = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
    const tracked = new Set(git(repoRoot, ["ls-files", "-z"]).split("\0").filter(Boolean));
    return { repoRoot, tracked, git: true, reason: null };
  } catch (err) {
    if (!gitCannotRun(err)) {
      if (/not a git repository/i.test(String(err?.stderr ?? ""))) throw new UsageError("not inside a git repository");
      throw new UsageError(`git failed: ${gitMessage(err)}`);
    }
    const repoRoot = findGitRoot(cwd);
    if (repoRoot === null) throw new UsageError("not inside a git repository");
    const onDisk = { has: (rel) => existsSync(path.join(repoRoot, rel)) };
    return { repoRoot, tracked: onDisk, git: false, reason: gitMessage(err) };
  }
}

function runGit(git, repoRoot, args, what) {
  try {
    return git(repoRoot, args);
  } catch (err) {
    throw new UsageError(`${what}: ${gitMessage(err)}`);
  }
}

/** The commit for `ref`, tried as given and then as origin/<ref>; a ref found neither way is an error. */
function resolveBase(git, repoRoot, ref) {
  const candidates = ref.startsWith("origin/") ? [ref] : [ref, `origin/${ref}`];
  for (const candidate of candidates) {
    try {
      return { ref: candidate, sha: git(repoRoot, ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`]).trim() };
    } catch (err) {
      if (gitCannotRun(err)) throw new UsageError(`git failed: ${gitMessage(err)}`);
    }
  }
  throw new UsageError(`base ${ref} was not found in this checkout; fetch it, or pass the ref the CI run diffed against`);
}

function diffAgainst(git, repoRoot, sha) {
  try {
    return parseUnifiedDiff(
      git(repoRoot, ["diff", "--unified=0", "--no-color", "--no-ext-diff", "--find-renames", "--src-prefix=a/", "--dst-prefix=b/", "--end-of-options", `${sha}...HEAD`]),
    );
  } catch (err) {
    const msg = gitMessage(err);
    if (/no merge base/i.test(msg)) throw new UsageError(`no merge base between ${sha} and HEAD; is this a shallow clone? fetch more history`);
    throw new UsageError(`git diff failed: ${msg}`);
  }
}

/** Paths among `paths` that the base changed since the merge base (HEAD...base). */
function baseChangedPaths(git, repoRoot, sha, paths) {
  if (paths.length === 0) return [];
  const out = runGit(git, repoRoot, ["diff", "--name-only", "-z", "--no-renames", "--end-of-options", `HEAD...${sha}`, "--", ...paths], "git diff failed");
  return out.split("\0").filter(Boolean);
}

/** Paths in `git status --porcelain=v1 -z` output; rename and copy records carry their original path too. */
export function parseStatusZ(out) {
  const parts = out.split("\0");
  const paths = new Set();
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    paths.add(entry.slice(3));
    if (/[RC]/.test(entry.slice(0, 2)) && parts[i + 1]) paths.add(parts[++i]);
  }
  return [...paths].sort();
}

const NO_GIT_NOTE =
  "git could not run here, so coverage paths were matched against files on disk under the directory holding .git instead of tracked files, and sourcesChanged was not checked";

export function run(argv, { cwd = process.cwd(), git = realGit } = {}) {
  const opts = parseCli(argv);
  if (opts.help) return { help: USAGE };
  const repo = locateRepo(cwd, git);
  const { repoRoot, tracked } = repo;
  const readText = (p, what) => {
    try {
      return readFileSync(path.resolve(cwd, p), "utf8");
    } catch (err) {
      throw new UsageError(`cannot read ${what} ${p}: ${err.code ?? err.message}`);
    }
  };
  const report = readReport(readText(opts.report, "report"));
  const coverageFiles = opts.coverage.map((p) => {
    const text = readText(p, "coverage file");
    const format = opts.format === "auto" ? detectFormat(text) : opts.format;
    if (format === null) throw new UsageError(`${p} is neither lcov nor Cobertura XML; pass --format if it is`);
    return { file: p, format, parsed: format === "lcov" ? parseLcov(text) : parseCobertura(text) };
  });

  const notes = [];
  if (!repo.git) notes.push(`${NO_GIT_NOTE} (${repo.reason})`);
  if (report.invalidPaths.length > 0) notes.push("some report paths are not repo-relative and were left out (invalidPaths)");

  let base = null;
  let diff = null;
  if (opts.base !== null && repo.git) {
    const resolved = resolveBase(git, repoRoot, opts.base);
    diff = diffAgainst(git, repoRoot, resolved.sha);
    const renamedFrom = new Map(diff.filter((f) => f.status === "renamed").map((f) => [f.path, f.oldPath]));
    const reportPaths = report.files.map((f) => f.path);
    const asked = [...new Set([...reportPaths, ...reportPaths.map((p) => renamedFrom.get(p)).filter((p) => p !== undefined && isSafeRepoPath(p))])];
    const changed = new Set(baseChangedPaths(git, repoRoot, resolved.sha, asked));
    const changedFiles = reportPaths.filter((p) => changed.has(p) || changed.has(renamedFrom.get(p) ?? ""));
    base = { ref: resolved.ref, sha: resolved.sha, changedFiles };
    if (changedFiles.length > 0) {
      notes.push(
        "the base branch changed listed files since the merge base (base.changedFiles); on pull_request CI measured the merge commit, so its line numbers for those files can differ from this checkout",
      );
    }
  } else if (opts.base !== null) {
    base = { ref: opts.base, sha: null, changedFiles: null };
    notes.push("--base was not checked because git could not run; notAdded, regressed and base.changedFiles are null");
  } else {
    notes.push("without --base the estimate assumes every line the report counted as covered is still covered");
  }

  const result = compare(report, coverageFiles, { repoRoot, coverageRoot: opts.coverageRoot, tracked, diff });
  const listed = report.files.map((f) => f.path);
  const sourcesChanged = !repo.git
    ? null
    : listed.length === 0
      ? []
      : parseStatusZ(runGit(git, repoRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=no", "--", ...listed], "git status failed"));
  return {
    schemaVersion: 1,
    report: {
      tool: report.tool,
      verdict: report.verdict,
      percent: report.percent,
      threshold: report.threshold,
      coveredLines: report.coveredLines,
      coverableLines: report.coverableLines,
    },
    coverage: { files: coverageFiles.map((c) => ({ path: c.file, format: c.format })), ...result.coverage },
    lines: result.lines,
    base,
    coverableMismatch: result.coverableMismatch,
    sourcesChanged,
    invalidPaths: report.invalidPaths,
    estimate: result.estimate,
    git: repo.git,
    notes,
  };
}

function isMain() {
  try {
    return realpathSync(process.argv[1] ?? "") === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  try {
    const out = run(process.argv.slice(2));
    if (out.help) console.log(out.help);
    else console.log(JSON.stringify(out, null, 1));
  } catch (err) {
    console.error(`check-lines: ${err instanceof UsageError ? err.message : (err?.stack ?? String(err))}`);
    process.exit(2);
  }
}
