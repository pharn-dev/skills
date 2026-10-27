// Tests for skills/pharn-ci-cover/scripts/check-lines.mjs. Run: node --test plugins/pharn-ci/tests/*.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  atLeast,
  compare,
  detectCoverageFormat,
  estimateOf,
  findGitRoot,
  gitCannotRun,
  isSafeRepoPath,
  parseCli,
  parseCobertura,
  parseLcov,
  parseStatusZ,
  parseUnifiedDiff,
  percentOf,
  readReport,
  run,
  UsageError,
} from "../skills/pharn-ci-cover/scripts/check-lines.mjs";

const SCRIPT = fileURLToPath(new URL("../skills/pharn-ci-cover/scripts/check-lines.mjs", import.meta.url));
const BOM = String.fromCharCode(0xfeff);

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

/** A git error the way execFileSync throws it: a message, stderr text and, for spawn failures, a code. */
function gitError(stderr, code) {
  const err = new Error("Command failed: git");
  err.stderr = stderr;
  if (code) err.code = code;
  return err;
}

const throwing = (err) => () => {
  throw err;
};

const XCRUN = "git: error: couldn't create cache file '/var/folders/x/T/xcrun_db-1' (errno=Operation not permitted)\n";

describe("parseCli", () => {
  test("needs a report and at least one coverage file", () => {
    assert.throws(() => parseCli(["--coverage", "a.info"]), UsageError);
    assert.throws(() => parseCli(["--report", "r.json"]), UsageError);
    assert.throws(() => parseCli(["--report", "r.json", "--coverage", "a", "extra"]), UsageError);
  });
  test("rejects unknown formats, escaping coverage roots and option-like bases", () => {
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--format", "clover"]), /lcov, cobertura or auto/);
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--coverage-root", "../x"]), /must not contain a "\.\." segment/);
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--coverage-root", "/abs"]), /not absolute/);
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--base=-x"]), /--base/);
    assert.throws(() => parseCli(["--report", "r", "--coverage", "a", "--base="]), /--base/);
  });
  test("collects repeated coverage files and the base", () => {
    const o = parseCli(["--report", "r", "--coverage", "a", "--coverage", "b", "--coverage-root", "packages/core", "--base", "main"]);
    assert.deepEqual(o.coverage, ["a", "b"]);
    assert.equal(o.coverageRoot, "packages/core");
    assert.equal(o.format, "auto");
    assert.equal(o.base, "main");
    assert.equal(parseCli(["--report", "r", "--coverage", "a"]).base, null);
  });
});

describe("readReport", () => {
  test("reads the uncovered lines, deduplicated and sorted, and the excluded files", () => {
    const r = report();
    r.diffCoverage.files[0].uncoveredLines = [20, 8, 8, 0, -1, 1.5];
    r.diffCoverage.excludedFiles = ["src/gen.mjs"];
    const out = readReport(JSON.stringify(r));
    assert.deepEqual(out.files, [{ path: "src/discount.mjs", lines: [8, 20], coverableLines: 25 }]);
    assert.deepEqual([...out.excludedFiles], ["src/gen.mjs"]);
  });
  test("keeps fully covered files, so --base can check them", () => {
    const r = report();
    r.diffCoverage.files.push({ path: "src/cart.mjs", percent: 100, coveredLines: 3, coverableLines: 3, uncoveredLines: [] });
    assert.deepEqual(readReport(JSON.stringify(r)).files[1], { path: "src/cart.mjs", lines: [], coverableLines: 3 });
  });
  test("leaves out paths that are not repo-relative", () => {
    const r = report();
    for (const p of ["/etc/passwd", "../outside.mjs", "a\0b.mjs", "C:\\x.mjs"]) {
      r.diffCoverage.files.push({ path: p, percent: 0, coveredLines: 0, coverableLines: 1, uncoveredLines: [1] });
    }
    const out = readReport(JSON.stringify(r));
    assert.deepEqual(
      out.files.map((f) => f.path),
      ["src/discount.mjs"]
    );
    assert.deepEqual(out.invalidPaths, ["/etc/passwd", "../outside.mjs", "a\0b.mjs", "C:\\x.mjs"]);
    assert.equal(isSafeRepoPath("src/a b.mjs"), true);
  });
  test("reads a Report v2 the same way as v1", () => {
    const v1 = readReport(JSON.stringify(report()));
    const v2 = report();
    v2.schemaVersion = 2;
    v2.testIntegrity = { mode: "warn", source: "default", verdict: "pass", signals: [], languages: [] };
    assert.deepEqual(readReport(JSON.stringify(v2)), v1);
  });
  test("refuses non-reports and reports without diff coverage", () => {
    assert.throws(() => readReport("not json"), /not JSON/);
    assert.throws(() => readReport(JSON.stringify({ schemaVersion: "2", tool: { name: "pharn-ci" } })), /Report v1 or v2/);
    assert.throws(() => readReport(JSON.stringify({ ...report(), schemaVersion: 3 })), /Report v1 or v2/);
    assert.throws(() => readReport(JSON.stringify({ ...report(), schemaVersion: 1 })), /Report v1 or v2/);
    assert.throws(() => readReport(JSON.stringify(report({ diffCoverage: null }))), /no diff coverage/);
    const bad = report();
    bad.diffCoverage.files = [{ path: "", uncoveredLines: [] }];
    assert.throws(() => readReport(JSON.stringify(bad)), /malformed/);
  });
});

describe("parsers", () => {
  test("detects lcov and Cobertura as pharn-ci does", () => {
    assert.equal(detectCoverageFormat(`${BOM}  TN:\nSF:a`), "lcov");
    assert.equal(detectCoverageFormat('<?xml version="1.0"?>\n<coverage line-rate="1">'), "cobertura");
    assert.equal(detectCoverageFormat('<?xml version="1.0"?>\n<!-- x -->\n<!DOCTYPE coverage SYSTEM "c.dtd">\n<coverage/>'), "cobertura");
    assert.equal(detectCoverageFormat('<?xml version="1.0"?><coverage clover="4.5">'), "unknown");
    // PHPUnit's Clover output: root `coverage`, first child `project`.
    assert.equal(detectCoverageFormat('<?xml version="1.0"?>\n<coverage generated="1">\n  <project timestamp="1">'), "unknown");
    assert.equal(detectCoverageFormat("<report><coverage>"), "unknown");
    assert.equal(detectCoverageFormat(`${" ".repeat(1100)}SF:a`), "unknown");
    assert.equal(detectCoverageFormat(" \n "), "empty");
    assert.equal(detectCoverageFormat(""), "empty");
  });
  test("lcov skips malformed and orphan DA records, sums repeats and maps paths", () => {
    const p = parseLcov(
      "DA:1,1\nSF:a.js\nDA:2,1\nDA:x,1\nDA:3,-1\nDA:4\r\nDA:5,0\nend_of_record\nSF:/repo/a.js\nDA:2,3\nSF:b.js\nend_of_record\n",
      { repoRoot: "/repo" }
    );
    assert.deepEqual(
      [...p.map].map(([f, lines]) => [f, [...lines]]),
      [
        [
          "a.js",
          [
            [2, 4],
            [5, 0],
          ],
        ],
      ]
    );
    assert.equal(p.skipped, 4);
    const rooted = parseLcov("SF:src/a.ts\nDA:1,1\nSF:/repo/x.ts\nDA:1,1\n", { repoRoot: "/repo", coverageRoot: "packages/core" });
    assert.deepEqual([...rooted.map.keys()], ["packages/core/src/a.ts", "x.ts"]);
  });
  test("Cobertura reads class lines, not method lines, and resolves sources as pharn-ci does", () => {
    const xml = `<?xml version="1.0"?>
<!-- <class filename="ignored.py"> -->
<coverage><source>/stray</source><sources><source>/repo/src</source><source>.</source></sources>
<packages><package name="p"><classes>
<class name="a" filename="pkg/a&amp;b.py"><methods><method name="m"><lines><line number="1" hits="9"/></lines></method></methods>
<lines><line number="2" hits="1"/><line number="3" hits="0"/><line number="x" hits="1"/><line number="4"/></lines></class>
</classes></package></packages></coverage>`;
    const withoutRoot = parseCobertura(xml);
    assert.deepEqual(
      [...withoutRoot.map].map(([f, lines]) => [f, [...lines]]),
      [
        [
          "pkg/a&b.py",
          [
            [2, 1],
            [3, 0],
            [4, 0],
          ],
        ],
      ]
    );
    assert.equal(withoutRoot.skipped, 1);
    // The first source whose join stays under the repo root wins, whether or not that file exists.
    assert.deepEqual([...parseCobertura(xml, { repoRoot: "/repo" }).map.keys()], ["src/pkg/a&b.py"]);
  });
  test("the diff reader handles renames, quoted paths, tab suffixes, deletions and binary files", () => {
    const diff = [
      "diff --git a/src/old.mjs b/src/new.mjs",
      "similarity index 90%",
      "rename from src/old.mjs",
      "rename to src/new.mjs",
      "--- a/src/old.mjs",
      "+++ b/src/new.mjs",
      "@@ -8,0 +9,2 @@",
      "+nine",
      "+++ b/looks like a header",
      'diff --git "a/src/sp\\303\\251cial.mjs" "b/src/sp\\303\\251cial.mjs"',
      "index 1..2 100644",
      '--- "a/src/sp\\303\\251cial.mjs"',
      '+++ "b/src/sp\\303\\251cial.mjs"',
      "@@ -1 +1 @@",
      "-a",
      "+b",
      "diff --git a/src/with space.mjs b/src/with space.mjs",
      "--- a/src/with space.mjs\t",
      "+++ b/src/with space.mjs\t",
      "@@ -0,0 +1 @@",
      "+x",
      "diff --git a/src/gone.mjs b/src/gone.mjs",
      "deleted file mode 100644",
      "--- a/src/gone.mjs",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-y",
      "diff --git a/img.png b/img.png",
      "Binary files a/img.png and b/img.png differ",
    ].join("\n");
    const files = parseUnifiedDiff(diff);
    assert.deepEqual(
      files.map((f) => [f.path, f.oldPath, f.status, f.addedLines, f.binary ?? false]),
      [
        ["src/new.mjs", "src/old.mjs", "renamed", [9, 10], false],
        ["src/spécial.mjs", "src/spécial.mjs", "modified", [1], false],
        ["src/with space.mjs", "src/with space.mjs", "modified", [1], false],
        ["src/gone.mjs", "src/gone.mjs", "deleted", [], false],
        ["img.png", "img.png", "modified", [], true],
      ]
    );
  });
  test("git status -z records keep both paths of a rename", () => {
    assert.deepEqual(parseStatusZ("R  src/new.mjs\0src/old.mjs\0 M src/a.mjs\0C  src/copy.mjs\0src/a.mjs\0"), [
      "src/a.mjs",
      "src/copy.mjs",
      "src/new.mjs",
      "src/old.mjs",
    ]);
    assert.deepEqual(parseStatusZ(""), []);
  });
});

describe("percent and threshold", () => {
  test("follow pharn-ci's rounding and exact comparison", () => {
    assert.equal(percentOf(18, 25), 72);
    assert.equal(percentOf(19999, 20000), 99.99);
    assert.equal(percentOf(1, 20000), 0.01);
    assert.equal(percentOf(0, 0), null);
    assert.equal(percentOf(5, 5), 100);
    assert.equal(atLeast(15999, 20000, 80), false);
    assert.equal(atLeast(16000, 20000, 80), true);
    assert.equal(atLeast(801, 1000, 80.1), true);
    assert.equal(atLeast(800, 1000, 80.1), false);
    assert.deepEqual(estimateOf(15999, 20000, 80, "listed-lines"), {
      coveredLines: 15999,
      coverableLines: 20000,
      percent: 79.99,
      threshold: 80,
      meetsThreshold: false,
      basis: "listed-lines",
    });
    assert.equal(estimateOf(3, 4, null, "added-lines").meetsThreshold, null);
    assert.equal(estimateOf(0, 0, 100, "added-lines").meetsThreshold, true);
  });
});

describe("compare", () => {
  const tracked = new Set(["src/discount.mjs", "packages/core/src/a.ts"]);
  const opts = { tracked };
  const parsed = (text, options = {}) => ({ parsed: parseLcov(text, { repoRoot: "/repo", ...options }) });

  test("sorts listed lines into covered, uncovered and absent, and estimates the result", () => {
    const r = readReport(JSON.stringify(report()));
    const out = compare(r, [parsed(lcov("src/discount.mjs", { 8: 1, 9: 2, 11: 0, 12: 0, 15: 1, 16: 1 }))], opts);
    assert.deepEqual(out.lines.nowCovered, [{ path: "src/discount.mjs", lines: [8, 9, 15, 16] }]);
    assert.deepEqual(out.lines.stillUncovered, [{ path: "src/discount.mjs", lines: [11, 12] }]);
    assert.deepEqual(out.lines.notInCoverage, [{ path: "src/discount.mjs", lines: [20] }]);
    assert.equal(out.lines.checked, 7);
    assert.equal(out.lines.notAdded, null);
    assert.equal(out.lines.regressed, null);
    assert.equal(out.coverableMismatch, null);
    assert.deepEqual(out.estimate, {
      coveredLines: 22,
      coverableLines: 25,
      percent: 88,
      threshold: 80,
      meetsThreshold: true,
      basis: "listed-lines",
    });
  });

  test("sums hits across files, maps absolute paths and reports paths outside the repo", () => {
    const r = readReport(JSON.stringify(report()));
    const out = compare(
      r,
      [
        parsed(lcov("/repo/src/discount.mjs", { 8: 0 })),
        parsed(lcov("src/discount.mjs", { 8: 1 })),
        parsed(lcov("/app/src/discount.mjs", { 9: 5 })),
      ],
      opts
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
        })
      )
    );
    const rooted = compare(r, [parsed(lcov("src/a.ts", { 3: 1 }), { coverageRoot: "packages/core" })], opts);
    assert.deepEqual(rooted.lines.nowCovered, [{ path: "packages/core/src/a.ts", lines: [3] }]);
    assert.equal(rooted.estimate.meetsThreshold, null);
    const unrooted = compare(r, [parsed(lcov("src/a.ts", { 3: 1 }))], opts);
    assert.equal(unrooted.coverage.unmatchedPaths, 1);
    assert.deepEqual(unrooted.lines.notInCoverage, [{ path: "packages/core/src/a.ts", lines: [3] }]);
    const cob = parseCobertura(
      '<coverage><sources><source>/elsewhere</source><source>/repo/packages/core</source></sources><classes><class filename="src/a.ts"><lines><line number="3" hits="2"/></lines></class></classes></coverage>',
      { repoRoot: "/repo" }
    );
    const out = compare(r, [{ parsed: cob }], opts);
    assert.deepEqual(out.lines.nowCovered, [{ path: "packages/core/src/a.ts", lines: [3] }]);
  });
});

describe("git classification", () => {
  test("tells a git that cannot run from a git that failed", () => {
    assert.equal(gitCannotRun(gitError("", "ENOENT")), true);
    assert.equal(gitCannotRun(gitError("", "EACCES")), true);
    assert.equal(gitCannotRun(gitError("", "EPERM")), true);
    assert.equal(gitCannotRun(gitError(XCRUN)), true);
    assert.equal(gitCannotRun(gitError("fatal: detected dubious ownership in repository at '/x'\n")), false);
    assert.equal(gitCannotRun(gitError("fatal: not a git repository (or any of the parent directories): .git\n")), false);
    assert.equal(gitCannotRun(gitError("", "ENOBUFS")), false);
  });
});

/** A small repository: main, a feature branch with an edit, a new line in a renamed file, then main moves on. */
function makeRepo(dir) {
  const git = (...args) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", "main");
  mkdirSync(path.join(dir, "src"));
  mkdirSync(path.join(dir, "coverage"));
  writeFileSync(path.join(dir, "src", "a.mjs"), "export const a = 1;\nexport const b = 2;\nexport const c = 3;\n");
  writeFileSync(path.join(dir, "src", "old.mjs"), "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\n");
  git("add", "-A");
  git("commit", "-qm", "base");
  git("checkout", "-qb", "feature");
  writeFileSync(
    path.join(dir, "src", "a.mjs"),
    "export const a = 1;\nexport const b = 2;\nexport const c = 3;\nexport const d = 4;\nexport const e = 5;\nexport const f = 6;\n"
  );
  git("mv", "src/old.mjs", "src/new.mjs");
  writeFileSync(path.join(dir, "src", "new.mjs"), "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\n");
  git("add", "-A");
  git("commit", "-qm", "feature");
  git("checkout", "-q", "main");
  writeFileSync(path.join(dir, "src", "a.mjs"), "// header\nexport const a = 1;\nexport const b = 2;\nexport const c = 3;\n");
  writeFileSync(path.join(dir, "src", "old.mjs"), "ONE\ntwo\nthree\nfour\nfive\nsix\nseven\neight\n");
  git("commit", "-qam", "main moves on");
  git("checkout", "-q", "feature");
}

function featureReport(uncoveredA = [5, 6]) {
  return report({
    diffCoverage: {
      format: "lcov",
      percent: 50,
      threshold: 80,
      coveredLines: 2,
      coverableLines: 4,
      files: [
        { path: "src/a.mjs", percent: 33.33, coveredLines: 1, coverableLines: 3, uncoveredLines: uncoveredA },
        { path: "src/new.mjs", percent: 100, coveredLines: 1, coverableLines: 1, uncoveredLines: [] },
      ],
    },
  });
}

describe("--base (in a git repository)", () => {
  let dir;
  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), "check-lines-base-"));
    makeRepo(dir);
    writeFileSync(path.join(dir, "report.json"), JSON.stringify(featureReport()));
    writeFileSync(path.join(dir, "coverage", "lcov.info"), `${lcov("src/a.mjs", { 4: 1, 5: 1, 6: 0 })}${lcov("src/new.mjs", { 9: 0 })}`);
  });
  after(() => rmSync(dir, { recursive: true, force: true }));
  const args = (...extra) => ["--report", "report.json", "--coverage", "coverage/lcov.info", ...extra];

  test("recomputes the estimate from the diff and finds lines that lost coverage", () => {
    const out = run(args("--base", "main"), { cwd: dir });
    assert.deepEqual(out.lines.nowCovered, [{ path: "src/a.mjs", lines: [5] }]);
    assert.deepEqual(out.lines.stillUncovered, [{ path: "src/a.mjs", lines: [6] }]);
    assert.deepEqual(out.lines.notAdded, []);
    assert.deepEqual(out.lines.regressed, [{ path: "src/new.mjs", lines: [9] }]);
    assert.deepEqual(out.coverableMismatch, []);
    assert.deepEqual(out.estimate, {
      coveredLines: 2,
      coverableLines: 4,
      percent: 50,
      threshold: 80,
      meetsThreshold: false,
      basis: "added-lines",
    });
  });

  test("names the listed files the base changed, through the rename source too", () => {
    const out = run(args("--base", "main"), { cwd: dir });
    assert.equal(out.base.ref, "main");
    assert.match(out.base.sha, /^[0-9a-f]{40}$/);
    assert.deepEqual(out.base.changedFiles, ["src/a.mjs", "src/new.mjs"]);
    assert.ok(out.notes.some((n) => /merge commit/.test(n)));
  });

  test("flags listed lines that are not added lines, and coverable counts that differ", () => {
    writeFileSync(path.join(dir, "stale.json"), JSON.stringify(featureReport([2, 6])));
    writeFileSync(path.join(dir, "coverage", "partial.info"), lcov("src/a.mjs", { 4: 1, 5: 1, 6: 0 }));
    const out = run(["--report", "stale.json", "--coverage", "coverage/partial.info", "--base", "main"], { cwd: dir });
    assert.deepEqual(out.lines.notAdded, [{ path: "src/a.mjs", lines: [2] }]);
    assert.deepEqual(out.coverableMismatch, [{ path: "src/new.mjs", report: 1, local: 0 }]);
  });

  test("a base found neither as given nor under origin/ is a usage error", () => {
    assert.throws(() => run(args("--base", "nope"), { cwd: dir }), /base nope was not found/);
    const cli = spawnSync(process.execPath, [SCRIPT, ...args("--base", "nope")], { cwd: dir, encoding: "utf8" });
    assert.equal(cli.status, 2);
    assert.match(cli.stderr, /^check-lines: base nope was not found/);
  });

  test("without git, --base is reported as not checked", () => {
    const out = run(args("--base", "main"), { cwd: dir, git: throwing(gitError(XCRUN)) });
    assert.equal(out.git, false);
    assert.deepEqual(out.base, { ref: "main", sha: null, changedFiles: null });
    assert.equal(out.lines.notAdded, null);
    assert.equal(out.lines.regressed, null);
    assert.equal(out.coverableMismatch, null);
    assert.equal(out.sourcesChanged, null);
    assert.equal(out.estimate.basis, "listed-lines");
    assert.ok(out.notes.some((n) => /--base was not checked/.test(n)));
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
  const args = ["--report", "report.json", "--coverage", "coverage/lcov.info"];

  test("prints the comparison and says whether the listed sources changed", () => {
    const out = run(args, { cwd: dir });
    assert.equal(out.schemaVersion, 1);
    assert.equal(out.git, true);
    assert.equal(out.base, null);
    assert.deepEqual(out.invalidPaths, []);
    assert.deepEqual(out.coverage.files, [{ path: "coverage/lcov.info", format: "lcov" }]);
    assert.deepEqual(out.lines.stillUncovered, [{ path: "src/discount.mjs", lines: [20] }]);
    assert.equal(out.estimate.coveredLines, 24);
    assert.ok(out.notes.some((n) => /without --base/.test(n)));
    assert.deepEqual(out.sourcesChanged, []);
    writeFileSync(path.join(dir, "src", "discount.mjs"), "export const x = 2;\n");
    assert.deepEqual(run(args, { cwd: dir }).sourcesChanged, ["src/discount.mjs"]);
  });

  test("without a working git, matches files on disk from the directory holding .git", () => {
    for (const err of [gitError(XCRUN), gitError("", "ENOENT"), gitError("", "EPERM")]) {
      const out = run(args, { cwd: dir, git: throwing(err) });
      assert.equal(out.git, false);
      assert.equal(out.sourcesChanged, null);
      assert.deepEqual(out.lines.stillUncovered, [{ path: "src/discount.mjs", lines: [20] }]);
      assert.equal(out.coverage.unmatchedPaths, 0);
    }
    assert.equal(findGitRoot(path.join(dir, "src")), dir);
    const fromSubdir = run(["--report", "../report.json", "--coverage", "../coverage/lcov.info"], {
      cwd: path.join(dir, "src"),
      git: throwing(gitError(XCRUN)),
    });
    assert.deepEqual(fromSubdir.lines.stillUncovered, [{ path: "src/discount.mjs", lines: [20] }]);
    assert.equal(fromSubdir.coverage.unmatchedPaths, 0);
  });

  test("any other git failure is an error, not a silent fallback", () => {
    assert.throws(
      () => run(args, { cwd: dir, git: throwing(gitError("fatal: detected dubious ownership in repository at '/x'\n")) }),
      /git failed: fatal: detected dubious ownership/
    );
    assert.throws(
      () => run(args, { cwd: dir, git: throwing(gitError("fatal: not a git repository (or any of the parent directories): .git\n")) }),
      /not inside a git repository/
    );
    assert.throws(() => run(args, { cwd: dir, git: throwing(gitError("", "ENOBUFS")) }), /git failed: ENOBUFS/);
  });

  test("report paths outside the repo never reach git", () => {
    const r = report();
    r.diffCoverage.files.push({ path: "/etc/passwd", percent: 0, coveredLines: 0, coverableLines: 1, uncoveredLines: [1] });
    writeFileSync(path.join(dir, "hostile.json"), JSON.stringify(r));
    const out = run(["--report", "hostile.json", "--coverage", "coverage/lcov.info"], { cwd: dir });
    assert.deepEqual(out.invalidPaths, ["/etc/passwd"]);
    assert.equal(out.lines.checked, 7);
  });

  test("the command line exits 2 with a message on bad input, 0 with JSON otherwise", () => {
    const bad = spawnSync(process.execPath, [SCRIPT, "--report", "missing.json", "--coverage", "coverage/lcov.info"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /^check-lines: cannot read report missing\.json/);
    writeFileSync(path.join(dir, "clover.xml"), '<?xml version="1.0"?><coverage clover="4"></coverage>');
    const clover = spawnSync(process.execPath, [SCRIPT, "--report", "report.json", "--coverage", "clover.xml"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(clover.status, 2);
    assert.match(clover.stderr, /neither lcov nor Cobertura/);
    const ok = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).lines.checked, 7);
  });

  test("the command line runs through a symlink and from a path with a space", () => {
    const spaced = path.join(dir, "skill dir");
    mkdirSync(spaced);
    copyFileSync(SCRIPT, path.join(spaced, "check-lines.mjs"));
    symlinkSync(SCRIPT, path.join(dir, "linked.mjs"));
    for (const entry of [path.join(spaced, "check-lines.mjs"), path.join(dir, "linked.mjs")]) {
      const out = spawnSync(process.execPath, [entry, "--help"], { cwd: dir, encoding: "utf8" });
      assert.equal(out.status, 0, out.stderr);
      assert.match(out.stdout, /^usage: check-lines\.mjs/);
    }
  });
});
