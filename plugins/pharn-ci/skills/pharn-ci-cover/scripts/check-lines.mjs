#!/usr/bin/env node
// Re-check the added lines a pharn-ci report (Report v1) lists as uncovered against a fresh
// coverage report, and estimate the new diff coverage. Node core only; reads files and runs
// read-only git commands, writes nothing.
//
//   node check-lines.mjs --report <report.json> --coverage <file> [--coverage <file>]...
//                        [--coverage-root <dir>] [--format lcov|cobertura|auto]
//
// Prints one JSON object on stdout; exit 0. Usage and input errors: message on stderr, exit 2.
// When git cannot run (missing, or blocked by a sandbox), the current directory is taken as the
// repository root and files on disk stand in for tracked files; the output says so ("git": false).
// This is an estimate for the person's own check run, not a replacement for pharn-ci.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const USAGE =
  "usage: check-lines.mjs --report <report.json> --coverage <file> [--coverage <file>]... [--coverage-root <dir>] [--format lcov|cobertura|auto]";

export class UsageError extends Error {}

export function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        report: { type: "string" },
        coverage: { type: "string", multiple: true },
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
  return { report: v.report, coverage: v.coverage, coverageRoot: root ?? "", format };
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
  for (const f of dc.files) {
    if (typeof f?.path !== "string" || f.path === "" || !Array.isArray(f.uncoveredLines)) {
      throw new UsageError("the report's diffCoverage.files is malformed");
    }
    const lines = f.uncoveredLines.filter((n) => Number.isInteger(n) && n >= 1);
    if (lines.length > 0) files.push({ path: f.path, lines: [...new Set(lines)].sort((a, b) => a - b) });
  }
  return {
    tool: `${r.tool.name} ${typeof r.tool.version === "string" ? r.tool.version : "?"}`,
    verdict: r.verdict,
    percent: dc.percent ?? null,
    threshold: typeof dc.threshold === "number" ? dc.threshold : null,
    coveredLines: dc.coveredLines,
    coverableLines: dc.coverableLines,
    files,
  };
}

export function detectFormat(text) {
  const head = text.slice(0, 1024).replace(/^﻿/, "").trimStart();
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
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : "�";
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
 * Map a coverage file's records to repo-relative paths. Relative lcov paths start at the coverage
 * root (default: the repo root). Relative Cobertura filenames are joined to each <source> in order and
 * the first tracked result wins, as pharn-ci does; with no usable source, the coverage root applies.
 */
export function mapPaths(parsed, { repoRoot, coverageRoot, tracked }) {
  const cache = new Map();
  const resolve = (file) => {
    if (cache.has(file)) return cache.get(file);
    const f = toPosix(file);
    let result = null;
    if (path.isAbsolute(f) || /^[A-Za-z]:\//.test(f)) {
      result = repoRelative(repoRoot, f);
    } else {
      const candidates = [];
      for (const s of parsed.sources) {
        const src = toPosix(s);
        candidates.push(path.isAbsolute(src) ? path.join(src, f) : path.join(repoRoot, coverageRoot, src, f));
      }
      candidates.push(path.join(repoRoot, coverageRoot, f));
      const rels = candidates.map((c) => repoRelative(repoRoot, c)).filter((r) => r !== null);
      result = rels.find((r) => tracked.has(r)) ?? rels[0] ?? null;
    }
    cache.set(file, result);
    return result;
  };
  return parsed.records.map((r) => ({ ...r, path: resolve(r.file) }));
}

/** Diff coverage percent the way Report v1 shows it: two decimals, never rounded onto a verdict it does not have. */
export function displayPercent(covered, coverable, threshold) {
  if (coverable === 0) return null;
  if (covered === coverable) return 100;
  if (covered === 0) return 0;
  const exact = (covered * 100) / coverable;
  let p = Math.round(exact * 100) / 100;
  if (p >= 100) p = 99.99;
  if (p <= 0) p = 0.01;
  if (threshold !== null && exact < threshold && p >= threshold) p = Math.floor(exact * 100) / 100;
  return p;
}

function groupByPath(entries) {
  const byPath = new Map();
  for (const { path: p, line } of entries) {
    if (!byPath.has(p)) byPath.set(p, []);
    byPath.get(p).push(line);
  }
  return [...byPath].map(([p, lines]) => ({ path: p, lines }));
}

/** The comparison itself, on plain data. */
export function compare(report, coverageFiles, { repoRoot, coverageRoot, tracked }) {
  const hits = new Map();
  const coveragePaths = new Set();
  const unmatched = new Set();
  let skipped = 0;
  for (const cf of coverageFiles) {
    skipped += cf.parsed.skipped;
    for (const rec of mapPaths(cf.parsed, { repoRoot, coverageRoot, tracked })) {
      if (rec.path === null || !tracked.has(rec.path)) {
        unmatched.add(rec.file);
        continue;
      }
      coveragePaths.add(rec.path);
      const key = `${rec.path}\n${rec.line}`;
      hits.set(key, (hits.get(key) ?? 0) + rec.hits);
    }
  }
  const nowCovered = [];
  const stillUncovered = [];
  const notInCoverage = [];
  for (const f of report.files) {
    for (const line of f.lines) {
      const h = hits.get(`${f.path}\n${line}`);
      if (h === undefined) notInCoverage.push({ path: f.path, line });
      else if (h > 0) nowCovered.push({ path: f.path, line });
      else stillUncovered.push({ path: f.path, line });
    }
  }
  const covered = Math.min(report.coverableLines, report.coveredLines + nowCovered.length);
  const meets = report.threshold === null ? null : covered * 100 >= report.threshold * report.coverableLines;
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
    },
    estimate: {
      coveredLines: covered,
      coverableLines: report.coverableLines,
      percent: displayPercent(covered, report.coverableLines, report.threshold),
      threshold: report.threshold,
      meetsThreshold: meets,
    },
  };
}

function realGit(cwd, args) {
  return execFileSync("git", ["--literal-pathspecs", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
    timeout: 120_000,
  });
}

const NO_GIT_NOTE =
  "git could not run here, so coverage paths were matched against files on disk under the current directory instead of tracked files, and sourcesChanged was not checked";

/**
 * The repository root and how to tell whether a repo-relative path is a real file. Without a working
 * git (missing, or blocked by a sandbox) the current directory stands in for the root and files on
 * disk for tracked files; outside a repository is still an error.
 */
function locateRepo(cwd, git) {
  try {
    const repoRoot = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
    const tracked = new Set(git(repoRoot, ["ls-files", "-z"]).split("\0").filter(Boolean));
    return { repoRoot, tracked, git: true };
  } catch (err) {
    const stderr = String(err?.stderr ?? "");
    if (/not a git repository/i.test(stderr)) throw new UsageError("not inside a git repository");
    const repoRoot = path.resolve(cwd);
    const onDisk = { has: (rel) => existsSync(path.join(repoRoot, rel)) };
    return { repoRoot, tracked: onDisk, git: false };
  }
}

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
  const result = compare(report, coverageFiles, { repoRoot, coverageRoot: opts.coverageRoot, tracked });
  const listed = report.files.map((f) => f.path);
  const sourcesChanged = !repo.git
    ? null
    : listed.length === 0
      ? []
      : [
          ...new Set(
            git(repoRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=no", "--", ...listed])
              .split("\0")
              .filter((e) => e.length > 3)
              .map((e) => e.slice(3)),
          ),
        ].sort();
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
    sourcesChanged,
    estimate: result.estimate,
    git: repo.git,
    notes: repo.git ? [] : [NO_GIT_NOTE],
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("check-lines.mjs")) {
  try {
    const out = run(process.argv.slice(2));
    if (out.help) console.log(out.help);
    else console.log(JSON.stringify(out, null, 1));
  } catch (err) {
    console.error(`check-lines: ${err instanceof UsageError ? err.message : (err?.stack ?? String(err))}`);
    process.exit(2);
  }
}
