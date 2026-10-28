import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { UsageError, loadSchema, main, validatePolicy } from "../skills/pharn-ci-policy/scripts/check-policy.mjs";

const SKILL = fileURLToPath(new URL("../skills/pharn-ci-policy/", import.meta.url));
const CHECKER = path.join(SKILL, "scripts/check-policy.mjs");
const SCHEMA_FILE = path.join(SKILL, "scripts/policy.v1.json");
const schema = loadSchema();

/** The first problem's path and message for a document, or null when it is valid. */
const problemsOf = (doc) => validatePolicy(doc, schema);
const pathsOf = (doc) => problemsOf(doc).map((p) => p.path);

function withDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "check-policy-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function cli(args, files = {}) {
  return withDir((dir) => {
    for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
    const r = spawnSync(process.execPath, [CHECKER, ...args.map((a) => a.replace("$DIR", dir))], { encoding: "utf8", timeout: 30_000 });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
  });
}

describe("check-policy", () => {
  test("the bundled schema is byte for byte pharn-ci 0.4.0's schema/policy.v1.json", () => {
    const sha = createHash("sha256").update(readFileSync(SCHEMA_FILE)).digest("hex");
    assert.equal(sha, "54ea51b848bcb5be4292d6bc1440ac47149de0976649a5cf4d59604718ef4775");
  });

  test("a full valid policy and the minimal one pass", () => {
    assert.deepEqual(problemsOf({ version: 1 }), []);
    assert.deepEqual(
      problemsOf({
        version: 1,
        coverage: { threshold: 80.5, exclude: ["dist/**"], root: null },
        setup: {
          require: true,
          expect: ["claude-code", "mcp"],
          consistency: "warn",
          forbidden_permissions: ["Bash(curl:*)"],
          required_permissions_deny: ["Edit(//etc/**)"],
          allowed_mcp_servers: ["github"],
          forbidden_mcp_servers: ["evil-*"],
          required_hooks: [{ event: "PreToolUse", matcher: "Bash" }, { event: "Stop" }],
          forbidden_files: [".env"],
        },
        test_integrity: { mode: "block", signals: { TI01: "block", TI16: "off" }, accept_label: "pharn/accepted" },
        flaky: { quarantine: true },
        policy: { required: true, rules: { P01: "warn", P14: "info" } },
        agents: {
          labels: ["agent"],
          extra_logins: ["my-bot[bot]"],
          protected_paths: [".github/workflows/**"],
          protected_paths_mode: "warn",
          require_human_approval: true,
          max_files: 20,
          max_changed_lines: 500,
        },
        dependencies: { registries: ["npm", "pypi"], min_age_days: 7, min_weekly_downloads: 100 },
      }),
      []
    );
    assert.deepEqual(problemsOf({ version: 1, coverage: { root: "packages/core" } }), []);
  });

  test("type: a wrong type names its pointer; integer is not number; the document must be an object", () => {
    assert.deepEqual(problemsOf({ version: 1, coverage: { threshold: "80" } }), [
      { path: "/coverage/threshold", message: "must be a number" },
    ]);
    assert.deepEqual(problemsOf({ version: 1, agents: { max_files: 1.5 } }), [
      { path: "/agents/max_files", message: "must be an integer" },
    ]);
    assert.deepEqual(problemsOf({ version: 1, setup: { require: "yes" } }), [{ path: "/setup/require", message: "must be true or false" }]);
    assert.deepEqual(problemsOf({ version: 1, setup: [] }), [{ path: "/setup", message: "must be an object" }]);
    assert.deepEqual(problemsOf({ version: 1, setup: { expect: "claude-code" } }), [{ path: "/setup/expect", message: "must be a list" }]);
    assert.deepEqual(problemsOf([]), [{ path: "", message: "must be an object" }]);
    assert.deepEqual(problemsOf({ version: 1, agents: { max_files: 3 } }), []);
  });

  test("required and additionalProperties: a missing version and an unknown key, at any depth", () => {
    assert.deepEqual(problemsOf({ coverage: {} }), [{ path: "/version", message: "required key missing" }]);
    assert.deepEqual(problemsOf({ version: 1, foo: 1 }), [{ path: "/foo", message: "unknown key" }]);
    assert.deepEqual(pathsOf({ version: 1, policy: { rules: { P15: "warn" } } }), ["/policy/rules/P15"]);
    assert.deepEqual(pathsOf({ version: 1, test_integrity: { signals: { TI17: "warn" } } }), ["/test_integrity/signals/TI17"]);
    assert.deepEqual(pathsOf({ version: 1, setup: { required_hooks: [{ matcher: "Bash" }] } }), ["/setup/required_hooks/0/event"]);
    assert.deepEqual(pathsOf({ version: 1, setup: { required_hooks: [{ event: "Stop", extra: 1 }] } }), ["/setup/required_hooks/0/extra"]);
  });

  test("const and enum", () => {
    assert.deepEqual(problemsOf({ version: 2 }), [{ path: "/version", message: "must be 1" }]);
    assert.deepEqual(problemsOf({ version: "1" }), [{ path: "/version", message: "must be an integer" }]);
    const [mode] = problemsOf({ version: 1, test_integrity: { mode: "strict" } });
    assert.equal(mode.path, "/test_integrity/mode");
    assert.equal(mode.message, "must be one of: block, warn, off");
    assert.deepEqual(pathsOf({ version: 1, setup: { expect: ["claude-code", "nope"] } }), ["/setup/expect/1"]);
    assert.deepEqual(pathsOf({ version: 1, policy: { rules: { P02: "max" } } }), ["/policy/rules/P02"]);
  });

  test("minimum, maximum, minLength, maxLength and maxItems", () => {
    assert.deepEqual(problemsOf({ version: 1, coverage: { threshold: -1 } }), [
      { path: "/coverage/threshold", message: "must be at least 0" },
    ]);
    assert.deepEqual(problemsOf({ version: 1, coverage: { threshold: 100.01 } }), [
      { path: "/coverage/threshold", message: "must be at most 100" },
    ]);
    assert.deepEqual(problemsOf({ version: 1, coverage: { threshold: 0 } }), []);
    assert.deepEqual(pathsOf({ version: 1, agents: { max_files: 0 } }), ["/agents/max_files"]);
    assert.deepEqual(problemsOf({ version: 1, setup: { forbidden_files: [""] } }), [
      { path: "/setup/forbidden_files/0", message: "must not be empty" },
    ]);
    assert.deepEqual(problemsOf({ version: 1, agents: { labels: ["x".repeat(51)] } }), [
      { path: "/agents/labels/0", message: "must be at most 50 characters" },
    ]);
    assert.deepEqual(problemsOf({ version: 1, agents: { labels: ["x".repeat(50)] } }), []);
    assert.deepEqual(problemsOf({ version: 1, agents: { labels: ["😀".repeat(50)] } }), [], "length counts code points");
    assert.deepEqual(problemsOf({ version: 1, setup: { forbidden_files: Array.from({ length: 1001 }, (_, i) => `a${i}`) } }), [
      { path: "/setup/forbidden_files", message: "must have at most 1000 items" },
    ]);
  });

  test("pattern, through the glob, root, permission, login and hook definitions", () => {
    for (const bad of ["./x", "/x", "!x", "x/", "a//b", "../x", "a/../b", "a{b}", "a[b]", "a\\b", " x", "x "]) {
      assert.deepEqual(
        pathsOf({ version: 1, agents: { protected_paths: [bad] } }),
        ["/agents/protected_paths/0"],
        `glob ${JSON.stringify(bad)}`
      );
    }
    for (const good of ["src/**", "**/*.lock", "a?b", ".github/workflows/**"]) {
      assert.deepEqual(problemsOf({ version: 1, agents: { protected_paths: [good] } }), [], `glob ${good}`);
    }
    assert.match(problemsOf({ version: 1, agents: { protected_paths: ["/x"] } })[0].message, /not a valid glob/);
    assert.deepEqual(pathsOf({ version: 1, coverage: { root: "/abs" } }), ["/coverage/root"]);
    assert.deepEqual(pathsOf({ version: 1, coverage: { root: "../up" } }), ["/coverage/root"]);
    assert.deepEqual(pathsOf({ version: 1, setup: { forbidden_permissions: ["1bad"] } }), ["/setup/forbidden_permissions/0"]);
    assert.deepEqual(problemsOf({ version: 1, setup: { forbidden_permissions: ["Bash", "Bash(npm run *)"] } }), []);
    assert.deepEqual(pathsOf({ version: 1, agents: { extra_logins: ["-bad"] } }), ["/agents/extra_logins/0"]);
    assert.deepEqual(pathsOf({ version: 1, setup: { required_hooks: [{ event: "Pre Tool" }] } }), ["/setup/required_hooks/0/event"]);
  });

  test("anyOf: a root is a normalized directory or null", () => {
    assert.deepEqual(problemsOf({ version: 1, coverage: { root: null } }), []);
    assert.deepEqual(problemsOf({ version: 1, coverage: { root: 5 } }), [
      { path: "/coverage/root", message: "must match one of the allowed forms" },
    ]);
  });

  test("every problem is listed, in document order, up to a cap", () => {
    assert.deepEqual(pathsOf({ foo: 1, coverage: { threshold: "80" } }), ["/version", "/foo", "/coverage/threshold"]);
    const many = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`k${i}`, 1]));
    const problems = problemsOf({ version: 1, ...many });
    assert.equal(problems.length, 101);
    assert.match(problems.at(-1).message, /^50 more problems/);
  });

  test("an unknown key is escaped and cut as a JSON Pointer segment, and no value is echoed", () => {
    const secret = "ghp_" + "a".repeat(30);
    const doc = { version: 1, "a/b~c": 1, coverage: { threshold: secret }, setup: { forbidden_files: [secret, `${secret}\n`] } };
    const problems = problemsOf(doc);
    assert.ok(problems.some((p) => p.path === "/a~1b~0c"));
    const text = JSON.stringify(problems);
    assert.ok(!text.includes(secret), "a message repeated a value from the document");
    const long = problemsOf({ version: 1, ["k".repeat(100)]: 1 });
    assert.ok(long[0].path.length < 80);
    assert.ok(problemsOf({ version: 1, "x\u0007y": 1 })[0].path.includes("?"));
  });

  test("loadSchema refuses a keyword it does not implement and a $ref it cannot resolve", () => {
    withDir((dir) => {
      const write = (name, doc) => {
        const f = path.join(dir, name);
        writeFileSync(f, JSON.stringify(doc));
        return f;
      };
      assert.throws(() => loadSchema(write("a.json", { type: "object", oneOf: [] })), UsageError);
      assert.throws(() => loadSchema(write("b.json", { type: "object", properties: { x: { minItems: 1 } } })), /minItems/);
      assert.throws(() => loadSchema(write("c.json", { $ref: "https://example.com/x.json" })), /\$ref/);
      assert.throws(() => loadSchema(write("d.json", { type: "string", pattern: "(" })), /regular expression/);
      assert.throws(() => loadSchema(path.join(dir, "missing.json")), UsageError);
      assert.deepEqual(loadSchema(write("e.json", { type: "object", required: ["a"], properties: { a: { type: "string" } } })).required, [
        "a",
      ]);
    });
  });

  test("the CLI: exit 0 with the ok line, exit 1 with one pointer line per problem, exit 2 for input problems", () => {
    const ok = cli(["$DIR/p.json"], { "p.json": '{"version":1}' });
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /^ok — .*p\.json is a valid pharn-ci policy \(policy\.v1\.json, pharn-ci 0\.4\.0\)\n$/);

    const bad = cli(["$DIR/p.json"], { "p.json": '{"foo":1,"coverage":{"threshold":"80"}}' });
    assert.equal(bad.status, 1);
    assert.deepEqual(bad.stdout.trim().split("\n"), [
      "/version: required key missing",
      "/foo: unknown key",
      "/coverage/threshold: must be a number",
    ]);

    assert.equal(cli([]).status, 2);
    assert.equal(cli(["--nope", "x"]).status, 2);
    assert.equal(cli(["a.json", "b.json"]).status, 2);
    assert.equal(cli(["$DIR/missing.json"]).status, 2);
    const notJson = cli(["$DIR/p.json"], { "p.json": "{nope" });
    assert.equal(notJson.status, 2);
    assert.match(notJson.stderr, /not valid JSON/);
    assert.equal(cli(["$DIR/p.json"], { "p.json": JSON.stringify({ version: 1, pad: "x".repeat(1024 * 1024) }) }).status, 2);
    assert.equal(cli(["$DIR/p.json"], { "p.json": '﻿{"version":1}' }).status, 0, "a byte order mark is tolerated");
    const unsupported = cli(["$DIR/p.json", "--schema", "$DIR/s.json"], {
      "p.json": '{"version":1}',
      "s.json": '{"type":"object","oneOf":[]}',
    });
    assert.equal(unsupported.status, 2);
    assert.match(unsupported.stderr, /oneOf/);
    const custom = cli(["$DIR/p.json", "--schema=$DIR/s.json"], {
      "p.json": '{"a":"x"}',
      "s.json": '{"type":"object","required":["a"],"properties":{"a":{"type":"string"}}}',
    });
    assert.equal(custom.status, 0);
    assert.match(custom.stdout, /\(s\.json\)/);
  });

  test("main reports through the io it is given", () => {
    withDir((dir) => {
      const file = path.join(dir, "p.json");
      writeFileSync(file, '{"version":1,"x":1}');
      let out = "";
      let err = "";
      const code = main([file], { stdout: (s) => (out += s), stderr: (s) => (err += s) });
      assert.equal(code, 1);
      assert.equal(out, "/x: unknown key\n");
      assert.equal(err, "");
    });
  });

  test("the checker imports only node: core modules, none for the network, and never calls fetch", () => {
    const source = readFileSync(CHECKER, "utf8");
    const specifiers = [...source.matchAll(/^import\s[^;]*?from\s+"([^"]+)";$/gm)].map((m) => m[1]);
    assert.ok(specifiers.length >= 3);
    for (const s of specifiers) {
      assert.match(s, /^node:/);
      assert.ok(!["node:http", "node:https", "node:net", "node:dgram", "node:tls", "node:http2"].includes(s), s);
    }
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /\bimport\s*\(/);
    assert.doesNotMatch(source, /\brequire\s*\(/);
  });
});
