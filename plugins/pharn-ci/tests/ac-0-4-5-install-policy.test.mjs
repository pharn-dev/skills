// Acceptance test for pharn-ci-plugin-0-4-5 AC-12: pharn-ci-install's default workflow stays policy-free, and its
// references offer the policy input with id-token: write only for an app policy, say what else id-token: write turns
// on, and name file:<path> for a team with no account. The references are read inside the test body.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REFS = fileURLToPath(new URL("../skills/pharn-ci-install/references/", import.meta.url));

const yamlBlocks = (text) => [...text.matchAll(/^```ya?ml[^\n]*\n([\s\S]*?)^```/gm)].map((m) => m[1]);

const paragraphs = (text) =>
  text
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

// Sections: the text from one Markdown heading (outside code fences) to the next.
function sections(text) {
  const out = [];
  let current = [];
  let fenced = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (!fenced && /^#{1,6}\s/.test(line) && current.length) {
      out.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }
  if (current.length) out.push(current.join("\n"));
  return out;
}

test("AC-12: the default install workflow has no policy input or id-token, and the references offer an app policy, upload and file:<path> opt-in", () => {
  const workflows = readFileSync(join(REFS, "workflows.md"), "utf8");
  const blocks = yamlBlocks(workflows);
  assert.ok(blocks.length >= 2, "workflows.md has fewer than two yaml blocks");
  const defaultWorkflow = blocks[1];
  assert.doesNotMatch(defaultWorkflow, /^\s*policy:/m, "the default workflow sets a policy input");
  assert.doesNotMatch(defaultWorkflow, /id-token:\s*write/, "the default workflow grants id-token: write");

  const text = readdirSync(REFS)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => readFileSync(join(REFS, f), "utf8"))
    .join("\n\n");

  assert.ok(
    sections(text).some(
      (s) => /`policy`|\bpolicy:/.test(s) && /\binput\b/i.test(s) && /id-token:\s*write/.test(s) && /\bapp policy\b/i.test(s)
    ),
    "no section names the policy input with id-token: write for an app policy"
  );
  const ps = paragraphs(text);
  assert.ok(
    ps.some(
      (p) =>
        /id-token(?::\s*write)?/.test(p) &&
        /upload:\s*auto|`upload`[^.]*`auto`/.test(p) &&
        /Pharn GitHub App/i.test(p) &&
        /\bredacted\b/i.test(p)
    ),
    "no passage says id-token: write also lets upload: auto upload the redacted run when the org installed the Pharn GitHub App"
  );
  assert.ok(
    ps.some((p) => /file:<path>|`(?:policy:\s*)?file:[^`\s]*`/.test(p) && /\baccount\b/i.test(p)),
    "no passage names file:<path> for a team with no account"
  );
});
