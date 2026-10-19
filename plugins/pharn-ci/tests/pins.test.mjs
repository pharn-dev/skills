// The install skill hard-codes pharn-ci's release commit and the action pins it writes. These tests keep the
// skill, its references and its eval graders on the commit in evals/fixtures/manifest.json, keep every pin a
// full SHA, and check that the eval graders accept the reference's own templates.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const PLUGIN = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(PLUGIN, rel), "utf8");
const manifest = JSON.parse(read("evals/fixtures/manifest.json"));
const SKILL = "skills/pharn-ci-install";
const references = read(`${SKILL}/references/workflows.md`);

const installGraders = readdirSync(path.join(PLUGIN, "evals"))
  .filter((d) => d.startsWith("install-"))
  .flatMap((d) => readdirSync(path.join(PLUGIN, "evals", d, "graders")).map((f) => `evals/${d}/graders/${f}`));

/** The fenced yaml blocks of a markdown text, in order. */
function yamlBlocks(text) {
  return [...text.matchAll(/```yaml\n([\s\S]*?)```/g)].map((m) => m[1]);
}

/** A regex grader's pattern, match mode and target path, read the way YAML reads its single-quoted scalars. */
function regexGrader(rel) {
  const text = read(rel);
  const pattern = /^pattern: '((?:[^']|'')*)'$/m.exec(text);
  assert.ok(pattern, `${rel} has a single-quoted pattern`);
  return {
    re: new RegExp(pattern[1].replaceAll("''", "'")),
    notContains: /^match: not_contains$/m.test(text),
    path: /^ {2}path: (.+)$/m.exec(text)?.[1],
  };
}

function passes(grader, content) {
  return grader.re.test(content) !== grader.notContains;
}

describe("pins", () => {
  test("every pharn-ci pin in the skill, its references and its graders is the manifest's release commit", () => {
    const files = [`${SKILL}/SKILL.md`, `${SKILL}/references/workflows.md`, `${SKILL}/references/coverage.md`, ...installGraders];
    let seen = 0;
    for (const rel of files) {
      for (const m of read(rel).matchAll(/pharn-dev\/pharn-ci@([0-9A-Za-z.]+)/g)) {
        seen++;
        assert.equal(m[1], manifest.pharnCiSha, `${rel} pins pharn-ci at ${m[1]}`);
      }
    }
    assert.ok(seen > 5);
    assert.match(read(`${SKILL}/SKILL.md`), new RegExp(manifest.pharnCiSha));
  });

  test("every uses: in the templates is a full commit SHA with its version as a comment", () => {
    const uses = yamlBlocks(references).flatMap((b) => [...b.matchAll(/uses:\s*(\S+)(.*)$/gm)]);
    assert.ok(uses.length > 10);
    for (const [, ref, rest] of uses) {
      assert.match(ref, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `${ref} is not pinned to a full SHA`);
      assert.match(rest, /^ # v\d/, `${ref} has no version comment`);
    }
  });
});

describe("the eval graders accept the reference's templates", () => {
  const [config, newWorkflow, , forkFirst, forkComment] = yamlBlocks(references);
  const graders = (dir) =>
    readdirSync(path.join(PLUGIN, "evals", dir, "graders"))
      .map((f) => `evals/${dir}/graders/${f}`)
      .filter((rel) => /^type: regex$/m.test(read(rel)) && !rel.includes("/unchanged-"));

  test("install-node-default: the config and the new workflow", () => {
    const files = { ".pharn/ci.yml": config, ".github/workflows/pharn-ci.yml": newWorkflow };
    const checked = graders("install-node-default");
    assert.ok(checked.length >= 10);
    for (const rel of checked) {
      const g = regexGrader(rel);
      assert.ok(g.path in files, `${rel} targets ${g.path}`);
      assert.ok(passes(g, files[g.path]), `${rel} rejects the reference template`);
    }
  });

  test("install-fork-comments: the two fork workflows", () => {
    const files = { ".github/workflows/pharn-ci.yml": forkFirst, ".github/workflows/pharn-ci-comment.yml": forkComment };
    for (const rel of graders("install-fork-comments")) {
      const g = regexGrader(rel);
      assert.ok(passes(g, files[g.path]), `${rel} rejects the reference template`);
    }
  });

  test("the safety graders reject what they guard against", () => {
    const pin = regexGrader("evals/install-node-default/graders/sha-pins-pharn-ci.md");
    assert.equal(passes(pin, "      - uses: actions/checkout@v4\n"), false);
    assert.equal(passes(pin, "      - uses: pharn-dev/pharn-ci@a88e62a # v0.1.0\n"), false);
    assert.equal(passes(pin, newWorkflow), true);
    const prt = regexGrader("evals/install-fork-comments/graders/no-pull-request-target-pharn-ci.md");
    assert.equal(passes(prt, "on:\n  pull_request_target:\n"), false);
    const headCheckout = regexGrader("evals/install-fork-comments/graders/comment-no-head-checkout.md");
    assert.equal(passes(headCheckout, "        with:\n          ref: ${{ github.event.workflow_run.head_sha }}\n"), false);
    const inputs = regexGrader("evals/install-node-default/graders/no-inputs.md");
    assert.equal(passes(inputs, "        with:\n          threshold: 80\n"), false);
  });
});
