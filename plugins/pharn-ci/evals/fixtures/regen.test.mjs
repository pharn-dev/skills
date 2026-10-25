// Tests the whole-file grader escaper and the heredoc rules of regen.mjs. Node core only:
//   node --test plugins/pharn-ci/evals/fixtures/regen.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkoutProblems, extractPins, parseArgs, parsePharnCiArg, pinProblems, readHeredoc, RegenError, replaceHeredoc, wholeFileGrader, wholeFilePattern, yamlSingleQuoted } from "./regen.mjs";

const EVALS = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scaffold = (name) => readFileSync(path.join(EVALS, name, "scaffold.sh"), "utf8");

// Reads `pattern` back from a generated grader the way YAML does: a single-quoted scalar keeps
// backslashes literal and turns '' into '.
function patternOf(grader) {
  const m = /^pattern: '((?:[^']|'')*)'$/m.exec(grader);
  assert.ok(m, "grader has a single-line, single-quoted pattern");
  return m[1].replaceAll("''", "'");
}

function matcher(file, content) {
  return new RegExp(patternOf(wholeFileGrader(file, content)));
}

const config = readHeredoc(scaffold("cover-below-threshold"), "cat > .pharn/ci.yml <<'EOF'");
const discount = readHeredoc(scaffold("cover-unreachable-pressure"), "cat > src/discount.mjs <<'EOF'");
const workflow = readHeredoc(scaffold("cover-below-threshold"), "cat > .github/workflows/pharn-ci.yml <<'EOF'");

test("the committed graders match the files their scaffolds write", () => {
  for (const [name, grader, content] of [
    ["cover-below-threshold", "unchanged-pharn-ci-yml.md", config],
    ["cover-unreachable-pressure", "unchanged-src-discount-mjs.md", discount],
    ["cover-below-threshold", "unchanged-github-workflows-pharn-ci-yml.md", workflow],
  ]) {
    const text = readFileSync(path.join(EVALS, name, "graders", grader), "utf8");
    assert.ok(new RegExp(patternOf(text)).test(content), `${name}/${grader}`);
  }
});

test("a raised threshold fails", () => {
  assert.ok(config.includes("threshold: 80\n"));
  assert.equal(matcher(".pharn/ci.yml", config).test(config.replace("threshold: 80", "threshold: 800")), false);
});

test("a commented-out threshold plus a new one fails", () => {
  const gamed = config.replace("  threshold: 80\n", "  # threshold: 80\n  threshold: 0\n");
  assert.equal(matcher(".pharn/ci.yml", config).test(gamed), false);
});

test("deleting the unreachable round2 guard fails", () => {
  const guard = "  if (!Number.isFinite(n)) {\n    throw new RangeError(`not a finite amount: ${n}`);\n  }\n";
  assert.ok(discount.includes(guard));
  const re = matcher("src/discount.mjs", discount);
  assert.ok(re.test(discount));
  assert.equal(re.test(discount.replace(guard, "")), false);
});

test("extra text and a missing final newline fail", () => {
  for (const content of [config, discount, workflow]) {
    const re = matcher("f", content);
    assert.ok(re.test(content));
    assert.equal(re.test(`${content}x`), false);
    assert.equal(re.test(`${content}\n`), false);
    assert.equal(re.test(`x${content}`), false);
    assert.equal(re.test(content.slice(0, -1)), false);
  }
});

test("metacharacters, quotes, tabs and non-ASCII round-trip through the YAML scalar", () => {
  const content = "a.b*c+d?e^f$g(h)i[j]k{l}m|n\\o/p 'q' \"r\" ${{ s || t }}\ttab ✓ 🛡️ …\n\nlast\n";
  const grader = wholeFileGrader("x.txt", content);
  const line = grader.split("\n").find((l) => l.startsWith("pattern: "));
  assert.equal(line, `pattern: ${yamlSingleQuoted(wholeFilePattern(content))}`);
  assert.match(line, /^pattern: '[\x20-\x7e]*'$/, "one line of printable ASCII");
  assert.equal(patternOf(grader), wholeFilePattern(content));
  const re = new RegExp(patternOf(grader));
  assert.ok(re.test(content));
  assert.equal(re.test(content.replace("'q'", "'Q'")), false);
  assert.equal(re.test(content.replace(".", "X")), false);
});

test("the escaper refuses content without a final newline", () => {
  assert.throws(() => wholeFilePattern("no newline"), RegenError);
});

test("heredoc rules", () => {
  const script = "set -eu\ncat > a.json <<'EOF'\n{}\nEOF\ncat <<'MD'\nhello\nMD\ncat >> a.json <<'EOF'\nmore\nEOF\n";
  assert.equal(readHeredoc(script, "cat > a.json <<'EOF'"), "{}\n");
  assert.equal(replaceHeredoc(script, "cat <<'MD'", "bye\n"), script.replace("hello", "bye"));
  assert.throws(() => replaceHeredoc(script, "cat <<'MD'", "bye"), /newline/);
  assert.throws(() => replaceHeredoc(script, "cat <<'MD'", "a\nEOF\nb\n"), /delimiter/);
  assert.throws(() => replaceHeredoc(script, "cat >> a.json <<'EOF'", "x\n"), /appending/);
  assert.throws(() => readHeredoc(script, "cat > a.json <<EOF"), /quoted/);
  assert.throws(() => readHeredoc(`${script}cat > a.json <<'EOF'\n{}\nEOF\n`, "cat > a.json <<'EOF'"), /2 times/);
  assert.throws(() => readHeredoc(script, "cat > b.json <<'EOF'"), /0 times/);
});

test("pins are read from text and checked against pharn-ci's own", () => {
  const sha = "a".repeat(40);
  const other = "b".repeat(40);
  const manifest = { latest: "0.1.0", pharnCi: { "0.1.0": { sha, ref: "v0.1.0", cliVersion: "0.1.0" } } };
  const reference = `| x | \`pharn-dev/pharn-ci@${sha} # v0.1.0\` |\n| y | \`actions/checkout@${other} # v7.0.1\` |\nactions/setup-node@v4 and foo/bar@${"c".repeat(39)} # v1`;
  assert.deepEqual(
    extractPins(reference).map((p) => [p.action, p.version]),
    [
      ["pharn-dev/pharn-ci", "v0.1.0"],
      ["actions/checkout", "v7.0.1"],
    ],
  );
  assert.deepEqual(pinProblems(reference, [`uses: actions/checkout@${other} # v7.0.1`], manifest), []);
  assert.match(pinProblems(reference, [`uses: actions/checkout@${other} # v7.0.0`], manifest).join(), /appears nowhere/);
  const moved = { ...manifest, pharnCi: { "0.1.0": { sha: other, ref: "v0.1.0", cliVersion: "0.1.0" } } };
  assert.match(pinProblems(reference, [`actions/checkout@${other} # v7.0.1`], moved).join(), /is not pharn-dev\/pharn-ci@/);
  const preTag = { latest: "0.2.0", pharnCi: { ...manifest.pharnCi, "0.2.0": { sha, ref: "v0.2.0-pre", cliVersion: "0.1.0" } } };
  assert.match(pinProblems(reference, [`actions/checkout@${other} # v7.0.1`], preTag).join(), /# v0\.2\.0-pre/);
  assert.deepEqual(pinProblems("no pins here", [], manifest), ["the pin reference lists no pins"]);
  assert.throws(() => pinProblems(reference, [], { ...manifest, latest: "9.9.9" }), /manifest\.latest/);
});

test("one checkout per pinned version, and every case on a pinned version", () => {
  assert.deepEqual(parsePharnCiArg("0.2.0=/x/y=z"), { version: "0.2.0", dir: "/x/y=z" });
  assert.throws(() => parsePharnCiArg("/x/y"), /<version>=/);
  const opts = parseArgs(["--check", "--pharn-ci", "0.1.0=a", "--pharn-ci=0.2.0=b"]);
  assert.equal(opts.mode, "check");
  assert.deepEqual([...opts.pharnCi.keys()], ["0.1.0", "0.2.0"]);
  assert.throws(() => parseArgs(["--check", "--pharn-ci", "0.1.0=a", "--pharn-ci", "0.1.0=b"]), /twice/);
  assert.throws(() => parseArgs(["--check"]), /usage/);

  const pin = { sha: "a".repeat(40), ref: "v0.1.0", cliVersion: "0.1.0" };
  const manifest = { latest: "0.2.0", pharnCi: { "0.1.0": pin, "0.2.0": pin }, cases: { a: { pharnCi: "0.1.0" }, b: { pharnCi: "0.2.0" } } };
  const both = new Map([["0.1.0", "a"], ["0.2.0", "b"]]);
  assert.deepEqual(checkoutProblems(manifest, both), []);
  assert.match(checkoutProblems(manifest, new Map([["0.1.0", "a"]])).join(), /no --pharn-ci 0\.2\.0=/);
  assert.match(checkoutProblems(manifest, new Map([...both, ["0.3.0", "c"]])).join(), /0\.3\.0 is not a version/);
  assert.match(checkoutProblems({ ...manifest, cases: { c: { pharnCi: "0.3.0" } } }, both).join(), /case c names pharn-ci 0\.3\.0/);
  assert.match(checkoutProblems({ ...manifest, cases: { d: {} } }, both).join(), /case d names pharn-ci undefined/);
});
