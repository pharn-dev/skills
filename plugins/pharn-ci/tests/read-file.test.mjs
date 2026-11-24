// The four helpers read every input file through one routine (the shared:read-file block, kept identical by
// shared-block.test.mjs): a regular file only, opened without blocking, up to a cap. Each row runs a helper's
// command line on one kind of file and expects it to return at once with the reason, never to hang or grow.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const script = (rel) => fileURLToPath(new URL(`../skills/${rel}`, import.meta.url));
const CHECK_LINES = script("pharn-ci-cover/scripts/check-lines.mjs");
const CHECK_COVERAGE = script("pharn-ci-install/scripts/check-coverage.mjs");
const CHECK_POLICY = script("pharn-ci-policy/scripts/check-policy.mjs");
const LIST_FIXES = script("pharn-ci-fix/scripts/list-fixes.mjs");
const MiB = 1024 * 1024;

const WINDOWS = process.platform === "win32";
const ROOT = typeof process.getuid === "function" && process.getuid() === 0;

const REPORT_V1 = JSON.stringify({
  schemaVersion: "1",
  tool: { name: "pharn-ci", version: "0.1.0" },
  verdict: "pass",
  diffCoverage: {
    format: "lcov",
    percent: 100,
    threshold: 80,
    coveredLines: 1,
    coverableLines: 1,
    files: [{ path: "src/a.mjs", percent: 100, coveredLines: 1, coverableLines: 1, uncoveredLines: [] }],
  },
  agentSetup: { files: [] },
  messages: [],
});
const REPORT_V2 = JSON.stringify({
  schemaVersion: 2,
  tool: { name: "pharn-ci", version: "0.9.0" },
  verdict: "pass",
  diffCoverage: null,
  agentSetup: { files: [] },
  messages: [],
});
const LCOV = "TN:\nSF:src/a.mjs\nDA:1,1\nend_of_record\n";

// Each target reads one file argument: `normal` is what that file holds when it is fine, `cap` the routine's limit for it.
const TARGETS = [
  {
    name: "check-lines --report",
    script: CHECK_LINES,
    args: (f) => ["--report", f, "--coverage", "lcov.info"],
    normal: REPORT_V1,
    cap: 32 * MiB,
  },
  {
    name: "check-lines --coverage",
    script: CHECK_LINES,
    args: (f) => ["--report", "report.json", "--coverage", f],
    normal: LCOV,
    cap: 256 * MiB,
  },
  {
    name: "check-coverage --coverage",
    script: CHECK_COVERAGE,
    args: (f) => ["--coverage", f],
    normal: LCOV,
    cap: 256 * MiB,
    missingExists: true,
  },
  { name: "check-policy", script: CHECK_POLICY, args: (f) => [f], normal: '{"version":1}', cap: MiB },
  {
    name: "check-policy --schema",
    script: CHECK_POLICY,
    args: (f) => ["policy.json", "--schema", f],
    normal: '{"type":"object"}',
    cap: MiB,
  },
  { name: "list-fixes --report", script: LIST_FIXES, args: (f) => ["--report", f], normal: REPORT_V2, cap: 32 * MiB },
];

// Each row makes the file under test at `dir/file` and names the reason the helper must give.
const ROWS = [
  { kind: "a FIFO", skip: WINDOWS, make: (dir, file) => execFileSync("mkfifo", [path.join(dir, file)]), reason: /is not a regular file/ },
  { kind: "a directory", make: (dir, file) => mkdirSync(path.join(dir, file)), reason: /is not a regular file/ },
  {
    kind: "a symlink to /dev/zero",
    skip: WINDOWS,
    make: (dir, file) => symlinkSync("/dev/zero", path.join(dir, file)),
    reason: /is not a regular file/,
  },
  {
    kind: "a file over the cap",
    make: (dir, file, t) => {
      writeFileSync(path.join(dir, file), "");
      truncateSync(path.join(dir, file), t.cap + 1); // sparse: no data blocks are written
    },
    reason: /is larger than \d+ MiB/,
  },
  { kind: "a missing file", make: () => {}, reason: /ENOENT/ },
  {
    kind: "an unreadable file",
    skip: WINDOWS || ROOT,
    make: (dir, file, t) => {
      writeFileSync(path.join(dir, file), t.normal);
      chmodSync(path.join(dir, file), 0o000);
    },
    reason: /EACCES/,
  },
];

describe("the helpers read files one way", () => {
  let dir;
  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), "read-file-"));
    const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
    const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "ignore", env });
    git("init", "-q", "-b", "main");
    mkdirSync(path.join(dir, "src"));
    writeFileSync(path.join(dir, "src", "a.mjs"), "export const a = 1;\n");
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-qm", "init");
    writeFileSync(path.join(dir, "report.json"), REPORT_V1);
    writeFileSync(path.join(dir, "lcov.info"), LCOV);
    writeFileSync(path.join(dir, "policy.json"), '{"version":1}');
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  const runOn = (t, file) => {
    const r = spawnSync(process.execPath, [t.script, ...t.args(file)], { cwd: dir, encoding: "utf8", timeout: 5_000 });
    return { status: r.status, signal: r.signal, stdout: r.stdout, stderr: r.stderr };
  };

  TARGETS.forEach((t, i) => {
    ROWS.forEach((row, j) => {
      test(`${t.name} on ${row.kind}`, { skip: row.skip }, () => {
        const file = `in-${i}-${j}`;
        row.make(dir, file, t);
        const r = runOn(t, file);
        assert.equal(r.signal, null, `${t.name} did not return within 5 s on ${row.kind}`);
        if (row.kind === "a missing file" && t.missingExists) {
          assert.equal(r.status, 0, r.stderr);
          assert.equal(JSON.parse(r.stdout).coverage[0].exists, false);
          return;
        }
        assert.equal(r.status, 2, `exit ${r.status}: ${r.stdout}${r.stderr}`);
        assert.match(r.stderr, row.reason);
        assert.ok(r.stderr.includes(file), `the message names the file: ${r.stderr}`);
      });
    });

    test(`${t.name} still reads a symlink to a regular file inside the repository`, () => {
      const real = `real-${i}`;
      writeFileSync(path.join(dir, real), t.normal);
      symlinkSync(real, path.join(dir, `link-${i}`));
      const r = runOn(t, `link-${i}`);
      assert.equal(r.status, 0, `exit ${r.status}: ${r.stdout}${r.stderr}`);
    });
  });
});
