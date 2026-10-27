// Tests for skills/pharn-ci-install/scripts/check-coverage.mjs. Run: node --test plugins/pharn-ci/tests/*.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkCoverage,
  chooseDiscoveredCoverage,
  compileGlob,
  detectCoverageFormat,
  discoverCoverage,
  filesOnDisk,
  fsListDir,
  matchCoveragePaths,
  parseCli,
  run,
  UsageError,
  walkGlob,
} from "../skills/pharn-ci-install/scripts/check-coverage.mjs";

const SCRIPT = fileURLToPath(new URL("../skills/pharn-ci-install/scripts/check-coverage.mjs", import.meta.url));
const temps = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "check-coverage-"));
  temps.push(dir);
  return dir;
}

function write(root, rel, text) {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), text);
}

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
}

function gitError(stderr, code) {
  return Object.assign(new Error(stderr || code), { stderr, ...(code ? { code } : {}), status: code ? null : 128 });
}

const lcov = (file, lines) =>
  `TN:\nSF:${file}\n${Object.entries(lines)
    .map(([n, h]) => `DA:${n},${h}`)
    .join("\n")}\nend_of_record\n`;

/** An in-memory directory lister over a list of file paths. */
function memoryListDir(files) {
  return (dir) => {
    const prefix = dir === "" ? "" : `${dir}/`;
    const names = new Map();
    for (const f of files) {
      if (!f.startsWith(prefix)) continue;
      const rest = f.slice(prefix.length);
      const slash = rest.indexOf("/");
      names.set(slash === -1 ? rest : rest.slice(0, slash), slash === -1 ? "file" : "directory");
    }
    return names.size === 0 && dir !== "" ? null : [...names].map(([name, kind]) => ({ name, kind }));
  };
}

describe("format detection", () => {
  test("follows pharn-ci's 1 KiB window and XML rules", () => {
    const prolog = `<?xml version="1.0"?>\n<!-- ${"x".repeat(1100)} -->\n<coverage/>`;
    assert.equal(detectCoverageFormat(prolog), "unknown");
    assert.equal(detectCoverageFormat('<coverage version="5"><sources>'), "cobertura");
    assert.equal(detectCoverageFormat("mode: set\nfoo.go:1.1,2.2 1 1"), "unknown");
  });
});

describe("globs and discovery", () => {
  test("globs match whole segments with ** and stay inside one with * and ?", () => {
    const m = compileGlob("**/coverage.cobertura.xml");
    assert.equal(m("coverage.cobertura.xml"), true);
    assert.equal(m("TestResults/abc/coverage.cobertura.xml"), true);
    assert.equal(m("TestResults/abc/coverage.cobertura.xml.bak"), false);
    assert.equal(compileGlob("packages/*/coverage/lcov.info")("packages/a/b/coverage/lcov.info"), false);
    assert.equal(compileGlob("a?c")("abc"), true);
  });

  test("one kind of report is found, several are ambiguous, none is not-found", () => {
    assert.deepEqual(chooseDiscoveredCoverage(["coverage/lcov.info"]), { kind: "found", files: ["coverage/lcov.info"] });
    assert.deepEqual(chooseDiscoveredCoverage(["b/coverage.cobertura.xml", "a/coverage.cobertura.xml"]), {
      kind: "found",
      files: ["a/coverage.cobertura.xml", "b/coverage.cobertura.xml"],
    });
    assert.deepEqual(chooseDiscoveredCoverage(["coverage.xml", "coverage/lcov.info"]), {
      kind: "ambiguous",
      files: ["coverage/lcov.info", "coverage.xml"],
    });
    assert.deepEqual(chooseDiscoveredCoverage(["node_modules/x/coverage.cobertura.xml", "src/a.ts"]), { kind: "not-found", files: [] });
  });

  test("the walk skips links and node_modules, and stops at the entry limit", () => {
    const root = tempDir();
    write(root, "TestResults/1/coverage.cobertura.xml", "<coverage/>");
    write(root, "node_modules/p/TestResults/coverage.cobertura.xml", "<coverage/>");
    write(root, "real/lcov.info", "SF:a\n");
    symlinkSync(path.join(root, "real/lcov.info"), path.join(root, "lcov.info"));
    assert.deepEqual(discoverCoverage(fsListDir(root)), { kind: "found", files: ["TestResults/1/coverage.cobertura.xml"] });
    const huge = () => Array.from({ length: 100_001 }, (_, i) => ({ name: `f${i}`, kind: "file" }));
    assert.equal(discoverCoverage(huge).kind, "over-limit");
    assert.deepEqual(walkGlob("src/*.ts", memoryListDir(["src/a.ts", "src/b/c.ts", "lib/d.ts"]), { files: 0, entries: 0 }), ["src/a.ts"]);
  });
});

describe("path matching", () => {
  const repoFiles = ["packages/core/src/a.ts", "packages/core/src/b.ts", "packages/web/src/a.ts", "README.md"];

  test("suggests the directory package-relative paths start from", () => {
    const m = matchCoveragePaths(["src/a.ts", "src/b.ts"], repoFiles, undefined);
    assert.deepEqual(m, { total: 2, unmatched: ["src/a.ts", "src/b.ts"], suggestedRoot: "packages/core" });
  });

  test("keeps an active coverage root in the suggestion, and suggests nothing for absolute or partial paths", () => {
    assert.equal(matchCoveragePaths(["core/src/a.ts"], ["packages/core/src/a.ts"], "core").suggestedRoot, "packages/core");
    assert.equal(matchCoveragePaths(["/app/src/a.ts"], repoFiles, undefined).suggestedRoot, null);
    assert.deepEqual(matchCoveragePaths(["README.md", "src/a.ts"], repoFiles, undefined), {
      total: 2,
      unmatched: ["src/a.ts"],
      suggestedRoot: null,
    });
  });
});

describe("checkCoverage", () => {
  const repo = (files, tracked = true) => ({ repoRoot: "/repo", files, tracked });
  const deps = (texts, files = Object.keys(texts)) => ({
    listDir: memoryListDir(files),
    readText: (name) => texts[name] ?? null,
    isIgnored: () => true,
  });

  test("a missing file is reported before an unreadable one, as pharn-ci orders them", () => {
    const out = checkCoverage({ entries: ["empty.info", "gone.info"] }, repo(["src/a.ts"]), deps({ "empty.info": "  " }));
    assert.equal(out.blocking, "COVERAGE_FILE_MISSING");
    assert.deepEqual(
      out.coverage.map((c) => [c.path, c.exists, c.format]),
      [
        ["empty.info", true, "empty"],
        ["gone.info", false, null],
      ]
    );
  });

  test("an ambiguous discovery blocks before any file is read", () => {
    const out = checkCoverage({ entries: [] }, repo(["src/a.ts"]), deps({ "coverage.xml": "<coverage/>", "lcov.info": "SF:a" }));
    assert.equal(out.from, "discovery");
    assert.deepEqual(out.discovery, { kind: "ambiguous", files: ["lcov.info", "coverage.xml"] });
    assert.deepEqual(out.codes, ["DISCOVERY_AMBIGUOUS"]);
    assert.deepEqual(out.coverage, []);
  });

  test("reports unsupported formats, Clover included", () => {
    const clover = '<?xml version="1.0"?>\n<coverage generated="1">\n <project timestamp="1">';
    const out = checkCoverage({ entries: ["clover.xml"] }, repo(["src/a.ts"]), deps({ "clover.xml": clover }));
    assert.deepEqual(out.codes, ["COVERAGE_FORMAT_UNSUPPORTED"]);
  });

  test("a partly matched report measures, and says what is ignored and what is committed", () => {
    const text = lcov("/repo/src/a.ts", { 1: 1 }) + lcov("gen/x.ts", { 1: 0 }) + "SF:src/a.ts\nDA:z,1\n";
    const out = checkCoverage(
      { entries: ["coverage/lcov.info"] },
      repo(["src/a.ts", "coverage/lcov.info"]),
      deps({ "coverage/lcov.info": text })
    );
    assert.equal(out.blocking, null);
    assert.deepEqual(out.codes, ["COVERAGE_PATHS_PARTIALLY_UNMATCHED", "COVERAGE_LINES_SKIPPED", "COVERAGE_FILE_TRACKED"]);
    assert.deepEqual(out.paths, {
      total: 2,
      matched: 1,
      unmatched: 1,
      unmatchedExample: "gen/x.ts",
      untrackedOnDisk: 0,
      suggestedRoot: null,
    });
    assert.equal(out.coverage[0].tracked, true);
  });

  test("a coverage root maps package-relative Cobertura and lcov paths", () => {
    const xml = '<coverage><classes><class filename="src/a.ts"><lines><line number="1" hits="1"/></lines></class></classes></coverage>';
    const out = checkCoverage(
      { entries: ["packages/core/coverage.xml"], coverageRoot: "packages/core" },
      repo(["packages/core/src/a.ts"]),
      deps({ "packages/core/coverage.xml": xml })
    );
    assert.deepEqual(out.codes, []);
    assert.equal(out.paths.matched, 1);
  });
});

describe("parseCli", () => {
  test("validates globs, the coverage root and the format the way pharn-ci does", () => {
    assert.deepEqual(parseCli([]), { entries: [], coverageRoot: undefined, format: "auto" });
    assert.deepEqual(parseCli(["--coverage", " a.info ", "--coverage-root", "./packages/core/"]).coverageRoot, "packages/core");
    assert.throws(() => parseCli(["--coverage", "packages/{a,b}/lcov.info"]), /only \*, \*\* and \? are supported/);
    assert.throws(() => parseCli(["--coverage", "/abs/*.info"]), /must not start with "\/"/);
    assert.throws(() => parseCli(["--coverage-root", "../x"]), /must not contain a "\.\." segment/);
    assert.throws(() => parseCli(["--format", "clover"]), /--format must be/);
    assert.throws(() => parseCli(["--report", "r"]), UsageError);
  });
});

describe("run", () => {
  function repoWithCoverage() {
    const root = tempDir();
    git(root, "init", "-q", "-b", "main");
    write(root, ".gitignore", "coverage/\n");
    write(root, "src/a.mjs", "export const a = 1;\n");
    git(root, "add", ".");
    git(root, "-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-qm", "init");
    const real = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" }).trim();
    write(root, "coverage/lcov.info", lcov(path.join(real, "src/a.mjs"), { 1: 1 }));
    write(root, "src/new.mjs", "export const b = 2;\n");
    write(root, "lcov.info", lcov("src/new.mjs", { 1: 1 }));
    return root;
  }

  test("checks the file discovery would pick, and whether git ignores it", () => {
    const root = repoWithCoverage();
    rmSync(path.join(root, "lcov.info"));
    const out = run([], { cwd: path.join(root, "src") });
    assert.equal(out.git, true);
    assert.deepEqual(out.discovery, { kind: "found", files: ["coverage/lcov.info"] });
    assert.deepEqual(
      out.coverage.map((c) => [c.path, c.format, c.tracked, c.ignored]),
      [["coverage/lcov.info", "lcov", false, true]]
    );
    assert.deepEqual(out.paths, { total: 1, matched: 1, unmatched: 0, unmatchedExample: null, untrackedOnDisk: 0, suggestedRoot: null });
    assert.equal(JSON.stringify(out).includes(root), false);
  });

  test("counts paths that exist but are not committed yet, and flags a coverage file git would commit", () => {
    const root = repoWithCoverage();
    const out = run(["--coverage", "lcov.info"], { cwd: root });
    assert.equal(out.blocking, "COVERAGE_PATHS_UNMATCHED");
    assert.equal(out.paths.untrackedOnDisk, 1);
    assert.equal(out.coverage[0].ignored, false);
    assert.match(out.notes.join("\n"), /lcov\.info is not git-ignored/);
    assert.match(out.notes.join("\n"), /not track yet/);
  });

  test("falls back to files on disk when git cannot run", () => {
    const root = repoWithCoverage();
    const blocked = () => {
      throw gitError("", "EPERM");
    };
    const out = run(["--coverage", "lcov.info"], { cwd: path.join(root, "src"), git: blocked });
    assert.equal(out.git, false);
    assert.equal(out.repoFiles, "on-disk");
    assert.deepEqual(
      out.coverage.map((c) => [c.tracked, c.ignored]),
      [[null, null]]
    );
    assert.equal(out.blocking, null);
    assert.equal(out.paths.untrackedOnDisk, null);
    assert.match(out.notes[0], /git could not run here/);
    assert.equal(filesOnDisk(root).files.includes("src/new.mjs"), true);
  });

  test("any other git failure is an error, and so is a directory outside a repository", () => {
    const root = tempDir();
    assert.throws(
      () =>
        run([], {
          cwd: root,
          git: () => {
            throw gitError("fatal: detected dubious ownership in repository");
          },
        }),
      /git failed: fatal: detected dubious ownership/
    );
    assert.throws(
      () =>
        run([], {
          cwd: root,
          git: () => {
            throw gitError("fatal: not a git repository");
          },
        }),
      /not inside a git repository/
    );
    assert.throws(
      () =>
        run([], {
          cwd: root,
          git: () => {
            throw gitError("", "ENOENT");
          },
        }),
      /not inside a git repository/
    );
  });

  test("the CLI prints JSON and exits 2 on a usage error", () => {
    const root = repoWithCoverage();
    const ok = spawnSync(process.execPath, [SCRIPT, "--coverage", "coverage/lcov.info"], { cwd: root, encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).schemaVersion, 1);
    const bad = spawnSync(process.execPath, [SCRIPT, "--coverage", "[x].info"], { cwd: root, encoding: "utf8" });
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /^check-coverage: --coverage "\[x\]\.info"/);
  });
});
