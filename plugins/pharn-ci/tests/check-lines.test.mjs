// Tests for skills/pharn-ci-cover/scripts/check-lines.mjs. Run: node --test plugins/pharn-ci/tests/
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  compare,
  detectFormat,
  displayPercent,
  parseCli,
  parseCobertura,
  parseLcov,
  readReport,
  run,
  UsageError,
} from "../skills/pharn-ci-cover/scripts/check-lines.mjs";

const SCRIPT = fileURLToPath(new URL("../skills/pharn-ci-cover/scripts/check-lines.mjs", import.meta.url));

function report(overrides = {}) {
  return {
    schemaVersion: "1",
    tool: { name: "pharn-ci", version: "0.1.0" },
    verdict: "fail",
    diffCoverage: {
      format: "lcov",
      percent: 72,
      threshold: 80,
      coveredLines: 18,
      coverableLines: 25,
      files: [{ path: "src/discount.mjs", percent: 72, coveredLines: 18, coverableLines: 25, uncoveredLines: [8, 9, 11, 12, 15, 16, 20] }],
    },
    agentSetup: { files: [] },
    messages: [{ level: "error", code: "DIFF_COVERAGE_BELOW_THRESHOLD", text: "Diff coverage 72% is below the threshold of 80%." }],
    ...overrides,
  };
}

function lcov(file, hits) {
  return `TN:\nSF:${file}\n${Object.entries(hits)
    .map(([l, h]) => `DA:${l},${h}`)
    .join("\n")}\nend_of_record\n`;
}

describe("parseCli", () => {
  test("needs a report and at least one coverage file", () => {
    assert.throws(() => parseCli(["--coverage", "a.info"]), UsageError);
    assert.throws(() => parseCli(["--report", "r.json"]), UsageError);
    assert.throws(() => parseCli(["--report", "r.json", "--coverage", "a", "extra"]), UsageError);
  });
  test("rejects unknown formats and escaping coverage roots", () => {
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--format", "clover"]), /lcov, cobertura or auto/);
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--coverage-root", "../x"]), /repo-relative/);
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--coverage-root", "/abs"]), /repo-relative/);
  });
  test("collects repeated coverage files", () => {
    const o = parseCli(["--report", "r", "--coverage", "a", "--coverage", "b", "--coverage-root", "packages/core"]);
    assert.deepEqual(o.coverage, ["a", "b"]);
    assert.equal(o.coverageRoot, "packages/core");
    assert.equal(o.format, "auto");
  });
});

describe("readReport", () => {
  test("reads the uncovered lines, deduplicated and sorted", () => {
    const r = report();
    r.diffCoverage.files[0].uncoveredLines = [20, 8, 8, 0, -1, 1.5];
    assert.deepEqual(readReport(JSON.stringify(r)).files, [{ path: "src/discount.mjs", lines: [8, 20] }]);
  });
  test("refuses non-reports and reports without diff coverage", () => {
    assert.throws(() => readReport("not json"), /not JSON/);
    assert.throws(() => readReport(JSON.stringify({ schemaVersion: "2", tool: { name: "pharn-ci" } })), /Report v1/);
    assert.throws(() => readReport(JSON.stringify(report({ diffCoverage: null }))), /no diff coverage/);
    const bad = report();
    bad.diffCoverage.files = [{ path: "", uncoveredLines: [] }];
    assert.throws(() => readReport(JSON.stringify(bad)), /malformed/);
  });
});

describe("parsers", () => {
  test("detects lcov and Cobertura, and nothing else", () => {
    assert.equal(detectFormat("﻿  TN:\nSF:a"), "lcov");
    assert.equal(detectFormat('<?xml version="1.0"?>\n<coverage line-rate="1">'), "cobertura");
    assert.equal(detectFormat('<?xml version="1.0"?><coverage clover="4.5">'), null);
    assert.equal(detectFormat("<report>"), null);
    assert.equal(detectFormat(""), null);
  });
  test("lcov skips malformed and orphan DA records", () => {
    const p = parseLcov("DA:1,1\nSF:a.js\nDA:2,1\nDA:x,1\nDA:3,-1\nDA:4\r\nDA:5,0\nend_of_record\n");
    assert.deepEqual(
      p.records.map((r) => [r.file, r.line, r.hits]),
      [
        ["a.js", 2, 1],
        ["a.js", 5, 0],
      ],
    );
    assert.equal(p.skipped, 4);
  });
  test("Cobertura reads class lines, not method lines, and its sources", () => {
    const xml = `<?xml version="1.0"?>
<!-- <class filename="ignored.py"> -->
<coverage><sources><source>/repo/src</source><source>.</source></sources>
<packages><package name="p"><classes>
<class name="a" filename="pkg/a&amp;b.py"><methods><method name="m"><lines><line number="1" hits="9"/></lines></method></methods>
<lines><line number="2" hits="1"/><line number="3" hits="0"/><line number="x" hits="1"/><line number="4"/></lines></class>
</classes></package></packages></coverage>`;
    const p = parseCobertura(xml);
    assert.deepEqual(p.sources, ["/repo/src", "."]);
    assert.deepEqual(
      p.records.map((r) => [r.file, r.line, r.hits]),
      [
        ["pkg/a&b.py", 2, 1],
        ["pkg/a&b.py", 3, 0],
        ["pkg/a&b.py", 4, 0],
      ],
    );
    assert.equal(p.skipped, 1);
  });
});

describe("displayPercent", () => {
  test("rounds to two decimals without crossing the threshold or the ends", () => {
    assert.equal(displayPercent(18, 25, 80), 72);
    assert.equal(displayPercent(15999, 20000, 80), 79.99);
    assert.equal(displayPercent(19999, 20000, null), 99.99);
    assert.equal(displayPercent(1, 20000, null), 0.01);
    assert.equal(displayPercent(0, 0, 80), null);
    assert.equal(displayPercent(5, 5, 100), 100);
  });
});

describe("compare", () => {
  const tracked = new Set(["src/discount.mjs", "packages/core/src/a.ts"]);
  const opts = { repoRoot: "/repo", coverageRoot: "", tracked };
  const parsed = (text) => ({ parsed: parseLcov(text) });

  test("sorts listed lines into covered, uncovered and absent, and estimates the result", () => {
    const r = readReport(JSON.stringify(report()));
    const out = compare(r, [parsed(lcov("src/discount.mjs", { 8: 1, 9: 2, 11: 0, 12: 0, 15: 1, 16: 1 }))], opts);
    assert.deepEqual(out.lines.nowCovered, [{ path: "src/discount.mjs", lines: [8, 9, 15, 16] }]);
    assert.deepEqual(out.lines.stillUncovered, [{ path: "src/discount.mjs", lines: [11, 12] }]);
    assert.deepEqual(out.lines.notInCoverage, [{ path: "src/discount.mjs", lines: [20] }]);
    assert.equal(out.lines.checked, 7);
    assert.deepEqual(out.estimate, { coveredLines: 22, coverableLines: 25, percent: 88, threshold: 80, meetsThreshold: true });
  });

  test("sums hits across files, maps absolute paths and reports paths outside the repo", () => {
    const r = readReport(JSON.stringify(report()));
    const out = compare(
      r,
      [parsed(lcov("/repo/src/discount.mjs", { 8: 0 })), parsed(lcov("src/discount.mjs", { 8: 1 })), parsed(lcov("/app/src/discount.mjs", { 9: 5 }))],
      opts,
    );
    assert.deepEqual(out.lines.nowCovered, [{ path: "src/discount.mjs", lines: [8] }]);
    assert.equal(out.coverage.unmatchedPaths, 1);
    assert.equal(out.coverage.unmatchedExample, "/app/src/discount.mjs");
    assert.equal(out.estimate.meetsThreshold, false);
  });

  test("applies the coverage root to relative lcov paths, and Cobertura sources first", () => {
    const r = readReport(
      JSON.stringify(
        report({
          diffCoverage: {
            percent: 50,
            threshold: null,
            coveredLines: 1,
            coverableLines: 2,
            files: [{ path: "packages/core/src/a.ts", percent: 50, coveredLines: 1, coverableLines: 2, uncoveredLines: [3] }],
          },
        }),
      ),
    );
    const rooted = compare(r, [parsed(lcov("src/a.ts", { 3: 1 }))], { ...opts, coverageRoot: "packages/core" });
    assert.deepEqual(rooted.lines.nowCovered, [{ path: "packages/core/src/a.ts", lines: [3] }]);
    assert.equal(rooted.estimate.meetsThreshold, null);
    const unrooted = compare(r, [parsed(lcov("src/a.ts", { 3: 1 }))], opts);
    assert.equal(unrooted.coverage.unmatchedPaths, 1);
    assert.deepEqual(unrooted.lines.notInCoverage, [{ path: "packages/core/src/a.ts", lines: [3] }]);
    const cob = parseCobertura(
      '<coverage><sources><source>/elsewhere</source><source>/repo/packages/core</source></sources><classes><class filename="src/a.ts"><lines><line number="3" hits="2"/></lines></class></classes></coverage>',
    );
    const out = compare(r, [{ parsed: cob }], opts);
    assert.deepEqual(out.lines.nowCovered, [{ path: "packages/core/src/a.ts", lines: [3] }]);
  });
});

describe("run (in a git repository)", () => {
  let dir;
  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), "check-lines-"));
    const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
    git("init", "-q");
    mkdirSync(path.join(dir, "src"));
    mkdirSync(path.join(dir, "coverage"));
    writeFileSync(path.join(dir, "src", "discount.mjs"), "export const x = 1;\n");
    git("add", "src/discount.mjs");
    git("-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-qm", "init");
    writeFileSync(path.join(dir, "report.json"), JSON.stringify(report()));
    writeFileSync(path.join(dir, "coverage", "lcov.info"), lcov("src/discount.mjs", { 8: 1, 9: 1, 11: 1, 12: 1, 15: 1, 16: 1, 20: 0 }));
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  test("prints the comparison and says whether the listed sources changed", () => {
    const out = run(["--report", "report.json", "--coverage", "coverage/lcov.info"], { cwd: dir });
    assert.equal(out.schemaVersion, 1);
    assert.equal(out.git, true);
    assert.deepEqual(out.notes, []);
    assert.deepEqual(out.coverage.files, [{ path: "coverage/lcov.info", format: "lcov" }]);
    assert.deepEqual(out.lines.stillUncovered, [{ path: "src/discount.mjs", lines: [20] }]);
    assert.equal(out.estimate.coveredLines, 24);
    assert.deepEqual(out.sourcesChanged, []);
    writeFileSync(path.join(dir, "src", "discount.mjs"), "export const x = 2;\n");
    assert.deepEqual(run(["--report", "report.json", "--coverage", "coverage/lcov.info"], { cwd: dir }).sourcesChanged, ["src/discount.mjs"]);
  });

  test("without a working git, matches files on disk and says so", () => {
    const blocked = () => {
      const err = new Error("Command failed: git rev-parse --show-toplevel");
      err.stderr = "git: error: couldn't create cache file '/var/folders/x/T/xcrun_db-1' (errno=Operation not permitted)\n";
      throw err;
    };
    const out = run(["--report", "report.json", "--coverage", "coverage/lcov.info"], { cwd: dir, git: blocked });
    assert.equal(out.git, false);
    assert.equal(out.notes.length, 1);
    assert.equal(out.sourcesChanged, null);
    assert.deepEqual(out.lines.stillUncovered, [{ path: "src/discount.mjs", lines: [20] }]);
    assert.equal(out.coverage.unmatchedPaths, 0);
    const notARepo = () => {
      const err = new Error("Command failed");
      err.stderr = "fatal: not a git repository (or any of the parent directories): .git\n";
      throw err;
    };
    assert.throws(() => run(["--report", "report.json", "--coverage", "coverage/lcov.info"], { cwd: dir, git: notARepo }), /not inside a git repository/);
  });

  test("the command line exits 2 with a message on bad input, 0 with JSON otherwise", () => {
    const bad = spawnSync(process.execPath, [SCRIPT, "--report", "missing.json", "--coverage", "coverage/lcov.info"], { cwd: dir, encoding: "utf8" });
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /^check-lines: cannot read report missing\.json/);
    writeFileSync(path.join(dir, "clover.xml"), '<?xml version="1.0"?><coverage clover="4"></coverage>');
    const clover = spawnSync(process.execPath, [SCRIPT, "--report", "report.json", "--coverage", "clover.xml"], { cwd: dir, encoding: "utf8" });
    assert.equal(clover.status, 2);
    assert.match(clover.stderr, /neither lcov nor Cobertura/);
    const ok = spawnSync(process.execPath, [SCRIPT, "--report", "report.json", "--coverage", "coverage/lcov.info"], { cwd: dir, encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).lines.checked, 7);
  });
});
