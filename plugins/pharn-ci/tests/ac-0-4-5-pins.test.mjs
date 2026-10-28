// Acceptance tests for pharn-ci-plugin-0-4-5: AC-1 (every pharn-ci pin names v0.4.0), AC-2 (the fixtures manifest
// pins exactly the versions ci.yml checks out and passes to regen.mjs --check) and AC-4 (plugin.json 0.2.0).
// Every target is read inside its test body, so a missing file is a failed test, never an uncollected file.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PLUGIN = join(ROOT, "plugins/pharn-ci");
const V040_SHA = "a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756";
const V020_SHA = "0873ce23f3595a3497325635b7bf3ee93ea77687";

const read = (abs) => readFileSync(abs, "utf8");
const listDir = (abs) => (existsSync(abs) ? readdirSync(abs).sort() : []);

// The files AC-1 reads: install SKILL.md, install references/*.md, every skill's scripts/*.mjs, and every
// install-* eval's graders/*.md.
function pinFiles() {
  const files = [join(PLUGIN, "skills/pharn-ci-install/SKILL.md")];
  const refs = join(PLUGIN, "skills/pharn-ci-install/references");
  for (const f of listDir(refs)) if (f.endsWith(".md")) files.push(join(refs, f));
  for (const skill of listDir(join(PLUGIN, "skills"))) {
    const scripts = join(PLUGIN, "skills", skill, "scripts");
    for (const f of listDir(scripts)) if (f.endsWith(".mjs")) files.push(join(scripts, f));
  }
  for (const c of listDir(join(PLUGIN, "evals"))) {
    if (!c.startsWith("install-")) continue;
    const graders = join(PLUGIN, "evals", c, "graders");
    for (const f of listDir(graders)) if (f.endsWith(".md")) files.push(join(graders, f));
  }
  return files;
}

// A literal pin is `pharn-dev/pharn-ci@<hex>` (the slash may be regex-escaped in a grader). A regex class such as
// `@[0-9a-f]{40}` is not a pin: it has no hex right after the `@`.
const PIN = /pharn-dev\\?\/pharn-ci@([0-9a-f]{7,40})(?![0-9a-f])/g;

// The text after a pin, up to the end of its line, with regex whitespace tokens and escapes folded, so a grader's
// `[ \t]*#\s*v0\.4\.0` reads as `# v0.4.0`.
function commentAfter(line, index) {
  return line
    .slice(index)
    .replace(/\\s[*+?]?|\[ \\t\][*+?]?|\\t|\[\\s\][*+?]?/g, " ")
    .replace(/\\/g, "");
}

function pinsIn(text) {
  const pins = [];
  for (const line of text.split("\n")) {
    for (const m of line.matchAll(PIN)) {
      pins.push({ sha: m[1], rest: commentAfter(line, m.index + m[0].length), line: line.trim() });
    }
  }
  return pins;
}

test("AC-1: every pharn-dev/pharn-ci pin in the install skill, the skill scripts and the install graders names a9314e9 # v0.4.0", () => {
  const problems = [];
  for (const file of pinFiles()) {
    const rel = file.slice(ROOT.length);
    for (const pin of pinsIn(read(file))) {
      if (pin.sha !== V040_SHA) problems.push(`${rel}: pin ${pin.sha} is not ${V040_SHA} — ${pin.line}`);
      else if (!/#\s*v0\.4\.0(?![0-9])/.test(pin.rest)) {
        problems.push(`${rel}: pin ${pin.sha} has no "# v0.4.0" comment — ${pin.line}`);
      }
    }
  }
  assert.deepEqual(problems, []);

  const workflows = join(PLUGIN, "skills/pharn-ci-install/references/workflows.md");
  assert.ok(pinsIn(read(workflows)).length > 0, "references/workflows.md carries no pharn-ci pin");

  const pinGraders = [];
  for (const c of listDir(join(PLUGIN, "evals"))) {
    if (!c.startsWith("install-")) continue;
    const graders = join(PLUGIN, "evals", c, "graders");
    for (const f of listDir(graders)) if (/^pin-.*\.md$/.test(f)) pinGraders.push(join(graders, f));
  }
  assert.ok(pinGraders.length > 0, "no install-*/graders/pin-*.md found");
  for (const g of pinGraders) {
    assert.ok(pinsIn(read(g)).length > 0, `${g.slice(ROOT.length)} carries no pharn-ci pin`);
  }

  const skill = read(join(PLUGIN, "skills/pharn-ci-install/SKILL.md"));
  assert.ok(skill.includes(V040_SHA), "pharn-ci-install SKILL.md does not name the v0.4.0 commit");
  assert.ok(!skill.includes(V020_SHA), "pharn-ci-install SKILL.md still names the v0.2.0 commit");
});

// The steps of the pharn-ci-fixtures job of ci.yml: every pharn-dev/pharn-ci checkout (version from its ref comment,
// sha, path) and every `--pharn-ci <version>=<path>` argument of its regen.mjs --check command.
function fixturesJob(ciYml) {
  const lines = ciYml.split("\n");
  const start = lines.findIndex((l) => /^ {2}pharn-ci-fixtures:\s*$/.test(l));
  assert.notEqual(start, -1, "ci.yml has no pharn-ci-fixtures job");
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}\S/.test(lines[i]) || /^\S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const job = lines.slice(start, end).join("\n");
  const steps = job.split(/\n(?= {6}- )/);
  const checkouts = new Map();
  for (const step of steps) {
    if (!/repository:\s*pharn-dev\/pharn-ci\s*$/m.test(step)) continue;
    const ref = /^\s*ref:\s*([0-9a-f]{40})\s*#\s*v(\d+\.\d+\.\d+)\s*$/m.exec(step);
    const path = /^\s*path:\s*(\S+)\s*$/m.exec(step);
    assert.ok(ref, `a pharn-ci checkout in ci.yml has no "ref: <sha> # v<version>" line:\n${step}`);
    assert.ok(path, `a pharn-ci checkout in ci.yml has no path:\n${step}`);
    checkouts.set(ref[2], { sha: ref[1], ref: `v${ref[2]}`, path: path[1] });
  }
  const regenStep = steps.find((s) => /regen\.mjs\s+--check/.test(s));
  assert.ok(regenStep, "the pharn-ci-fixtures job has no regen.mjs --check step");
  const passed = new Map();
  for (const m of regenStep.matchAll(/--pharn-ci\s+(\d+\.\d+\.\d+)=(\S+)/g)) passed.set(m[1], m[2]);
  return { checkouts, passed };
}

test("AC-2: the fixtures manifest pins 0.4.0 as latest and exactly the versions ci.yml checks out and passes to regen.mjs --check", () => {
  const manifest = JSON.parse(read(join(PLUGIN, "evals/fixtures/manifest.json")));
  assert.equal(manifest.pharnCi?.["0.4.0"]?.sha, V040_SHA);
  assert.equal(manifest.pharnCi?.["0.4.0"]?.ref, "v0.4.0");
  assert.equal(manifest.latest, "0.4.0");

  const { checkouts, passed } = fixturesJob(read(join(ROOT, ".github/workflows/ci.yml")));
  const manifestVersions = Object.keys(manifest.pharnCi).sort();
  assert.deepEqual([...checkouts.keys()].sort(), manifestVersions, "ci.yml checks out other versions than the manifest pins");
  assert.deepEqual([...passed.keys()].sort(), manifestVersions, "regen.mjs --check is passed other versions than the manifest pins");
  for (const version of manifestVersions) {
    const pin = manifest.pharnCi[version];
    const checkout = checkouts.get(version);
    assert.equal(checkout.sha, pin.sha, `ci.yml checks out pharn-ci ${version} at another sha than the manifest`);
    assert.equal(checkout.ref, pin.ref, `ci.yml's ref comment for ${version} differs from the manifest's ref`);
    assert.equal(passed.get(version), checkout.path, `regen.mjs --check is passed another path for ${version} than its checkout`);
  }
});

test("AC-4: plugin.json declares version 0.2.0", () => {
  const manifest = JSON.parse(read(join(PLUGIN, ".claude-plugin/plugin.json")));
  assert.equal(manifest.version, "0.2.0");
});
