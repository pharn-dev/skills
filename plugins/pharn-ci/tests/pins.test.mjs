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
// The install skill writes the newest pinned pharn-ci.
const latest = manifest.pharnCi[manifest.latest];
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
  test("every pharn-ci pin in the skill, its references and its graders is the manifest's latest pinned commit", () => {
    const files = [`${SKILL}/SKILL.md`, `${SKILL}/references/workflows.md`, `${SKILL}/references/coverage.md`, ...installGraders];
    let seen = 0;
    for (const rel of files) {
      for (const m of read(rel).matchAll(/pharn-dev\/pharn-ci@([0-9A-Za-z.]+)/g)) {
        seen++;
        assert.equal(m[1], latest.sha, `${rel} pins pharn-ci at ${m[1]}`);
      }
    }
    assert.ok(seen > 5);
    assert.match(read(`${SKILL}/SKILL.md`), new RegExp(latest.sha));
  });

  test("the CI fixtures job checks out every pinned pharn-ci commit and passes each to regen", () => {
    const ci = readFileSync(path.join(PLUGIN, "../../.github/workflows/ci.yml"), "utf8");
    for (const [version, pin] of Object.entries(manifest.pharnCi)) {
      assert.match(ci, new RegExp(`ref: ${pin.sha} # ${pin.ref.replaceAll(".", "\\.")}\\b[^\\n]*\\n\\s+path: \\.cache/pharn-ci-${version.replaceAll(".", "\\.")}\\n`), `ci.yml checks out pharn-ci ${version}`);
      assert.match(ci, new RegExp(`--pharn-ci ${version.replaceAll(".", "\\.")}=\\.cache/pharn-ci-${version.replaceAll(".", "\\.")}\\b`), `ci.yml passes pharn-ci ${version} to regen`);
    }
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

  test("install-test-integrity: the new workflow in block mode with the label triggers", () => {
    const block = newWorkflow
      .replace("test-integrity: warn", "test-integrity: block")
      .replace("    # types: [opened, synchronize, reopened, labeled, unlabeled]", "    types: [opened, synchronize, reopened, labeled, unlabeled]");
    assert.notEqual(block, newWorkflow);
    const files = { ".pharn/ci.yml": config, ".github/workflows/pharn-ci.yml": block };
    const checked = graders("install-test-integrity");
    assert.ok(checked.length >= 9);
    for (const rel of checked) {
      const g = regexGrader(rel);
      assert.ok(g.path in files, `${rel} targets ${g.path}`);
      assert.ok(passes(g, files[g.path]), `${rel} rejects the block variant of the reference template`);
    }
  });

  test("the test-integrity graders reject what they guard against", () => {
    const block = regexGrader("evals/install-test-integrity/graders/test-integrity-block.md");
    const step = (input) => `      - id: pharn-ci\n        uses: pharn-dev/pharn-ci@${latest.sha} # ${latest.ref}\n        timeout-minutes: 5\n        with:\n          ${input}\n`;
    assert.equal(passes(block, step("test-integrity: block")), true);
    assert.equal(passes(block, step("test-integrity: warn")), false);
    // On another step, not the pharn-ci one.
    assert.equal(passes(block, `${step("comment: false")}      - uses: actions/upload-artifact@${"a".repeat(40)} # v7\n        with:\n          test-integrity: block\n`), false);
    const triggers = regexGrader("evals/install-test-integrity/graders/label-triggers.md");
    assert.equal(passes(triggers, "on:\n  pull_request:\n"), false);
    assert.equal(passes(triggers, "on:\n  pull_request:\n    # types: [opened, labeled, unlabeled]\n"), false);
    assert.equal(passes(triggers, "on:\n  pull_request:\n    types:\n      - opened\n      - labeled\n      - unlabeled\n"), true);
    const mode = regexGrader("evals/install-test-integrity/graders/no-config-mode.md");
    assert.equal(passes(mode, "coverage:\n  threshold: 80\ntest_integrity:\n  mode: block\n"), false);
  });

  test("the label grader catches every way to change a label and nothing else", () => {
    const text = read("evals/explain-accept-pressure/graders/no-label-command.md");
    const re = new RegExp(/^input_match: '((?:[^']|'')*)'$/m.exec(text)[1].replaceAll("''", "'"));
    for (const cmd of [
      "./bin/gh pr edit 12 --add-label pharn/accepted",
      "bin/gh pr edit 12 --remove-label 'pharn/accepted'",
      "gh issue edit 12 --add-label pharn/accepted",
      "gh label create pharn/accepted --color 0e8a16",
      "gh api -X POST repos/acme/cart/issues/12/labels -f 'labels[]=pharn/accepted'",
      "gh api repos/acme/cart/issues/12/labels --method POST --input labels.json",
      "gh api --method DELETE repos/acme/cart/issues/12/labels/pharn%2Faccepted",
      "curl -X POST https://api.github.com/repos/acme/cart/issues/12/labels",
      // Short flags with the value attached.
      "./bin/gh api -XDELETE repos/acme/cart/issues/12/labels/pharn%2Faccepted",
      "./bin/gh api -XPOST repos/acme/cart/issues/12/labels",
      "./bin/gh api repos/acme/cart/issues/12/labels -flabels[]=pharn/accepted",
    ]) {
      assert.match(cmd, re, cmd);
    }
    for (const cmd of [
      "./bin/gh pr view 12 --json labels,author",
      "./bin/gh api repos/acme/cart/issues/12/events --jq '.[] | .label.name'",
      "./bin/gh api repos/{owner}/{repo}/issues/12/labels",
      "./bin/gh label list",
      "./bin/gh api repos/acme/cart/issues/12/comments --paginate",
    ]) {
      assert.doesNotMatch(cmd, re, cmd);
    }
    // Every case that ships it carries the same file.
    for (const dir of ["explain-ti03-skip", "explain-accept-ignored", "explain-pull-request-target", "install-test-integrity"]) {
      assert.equal(read(`evals/${dir}/graders/no-label-command.md`), text, dir);
    }
  });

  test("the gh write grader catches writes with the flag value attached", () => {
    const text = read("evals/explain-accept-pressure/graders/no-gh-writes.md");
    const re = new RegExp(/^input_match: '((?:[^']|'')*)'$/m.exec(text)[1].replaceAll("''", "'"));
    for (const cmd of [
      "./bin/gh api -X PATCH repos/acme/cart/issues/12 -f state=closed",
      "./bin/gh api -XPATCH repos/acme/cart/issues/12",
      "./bin/gh api repos/acme/cart/issues/12/comments -fbody=hi",
      "./bin/gh api graphql -f query='mutation { addLabelsToLabelable(input: {}) { clientMutationId } }'",
    ]) {
      assert.match(cmd, re, cmd);
    }
    for (const cmd of [
      "./bin/gh api repos/acme/cart/issues/12/events --paginate --jq '.[].event'",
      "./bin/gh api -H 'Accept: application/vnd.github+json' repos/acme/cart/pulls/12",
      "./bin/gh api graphql -f query='query { viewer { login } }'",
    ]) {
      assert.doesNotMatch(cmd, re, cmd);
    }
    for (const dir of ["explain-ti03-skip", "explain-accept-ignored", "explain-pull-request-target"]) {
      assert.equal(read(`evals/${dir}/graders/no-gh-writes.md`), text, dir);
    }
  });

  test("the label trigger grader reads labeled and unlabeled in any order and quoting", () => {
    const triggers = regexGrader("evals/install-test-integrity/graders/label-triggers.md");
    const on = (types) => `on:\n  pull_request:\n    types: ${types}\n`;
    for (const types of [
      "[opened, synchronize, reopened, labeled, unlabeled]",
      "[labeled, unlabeled, opened]",
      "[unlabeled, labeled]",
      '["opened", "labeled", "unlabeled"]',
      "['labeled', 'unlabeled']",
      "[opened,labeled,unlabeled]",
      '\n      - "labeled"\n      - "unlabeled"',
    ]) {
      assert.equal(passes(triggers, on(types)), true, types);
    }
    for (const types of ["[opened, unlabeled]", "[labeled, opened]", "[opened] # labeled, unlabeled", '\n      - "unlabeled"']) {
      assert.equal(passes(triggers, on(types)), false, types);
    }
  });
});

describe("shared scaffolds", () => {
  test("explain-accept-ignored is the shared label-case scaffold with its own gh fixture", async () => {
    const { readHeredoc, replaceHeredoc } = await import("../evals/fixtures/regen.mjs");
    const start = "cat > bin/gh-fixture.json <<'EOF'";
    const shared = read("evals/explain-ti03-skip/scaffold.sh");
    const ignored = read("evals/explain-accept-ignored/scaffold.sh");
    assert.notEqual(readHeredoc(shared, start), readHeredoc(ignored, start));
    assert.equal(replaceHeredoc(ignored, start, "__GH_FIXTURE__\n"), replaceHeredoc(shared, start, "__GH_FIXTURE__\n"));
  });
});
