// Fails if any GitHub Actions workflow uses a third-party action that is not pinned to a full
// 40-character commit SHA. A tag such as @v4 can be moved to point at different code; a SHA cannot.
// Local actions (./...) are fine. Run from the repo root: node .github/scripts/check-action-pins.mjs
// Adapted from pharn-dev/phargus scripts/check-action-pins.mjs; this copy also skips block scalars.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SHA = /^[0-9a-f]{40}$/;
// A key whose value is a block scalar (`run: |`, `script: >-`): the indented lines below it are text, not YAML keys.
const BLOCK_SCALAR = /^(\s*)(?:-\s+)?[\w-]+:\s*[|>][-+0-9]*\s*(?:#.*)?$/;
const USES = /^\s*(?:-\s*)?uses:\s*['"]?([^\s'"#]+)/;

export function unpinnedActions(text, file) {
  const bad = [];
  let blockIndent = -1;
  text.split("\n").forEach((line, index) => {
    const indent = line.length - line.trimStart().length;
    if (blockIndent >= 0) {
      if (line.trim() === "" || indent > blockIndent) return;
      blockIndent = -1;
    }
    const block = BLOCK_SCALAR.exec(line);
    if (block) {
      blockIndent = block[1].length;
      return;
    }
    const match = USES.exec(line);
    if (!match) return;
    const ref = match[1];
    if (ref.startsWith("./")) return;
    const at = ref.lastIndexOf("@");
    if (at === -1 || !SHA.test(ref.slice(at + 1))) bad.push(`${file}:${index + 1}  ${ref}`);
  });
  return bad;
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.ya?ml$/.test(entry.name) ? [path] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bad = [".github/workflows", ".github/actions"].flatMap(walk).flatMap((file) => unpinnedActions(readFileSync(file, "utf8"), file));
  if (bad.length > 0) {
    console.error("Actions must be pinned to a full commit SHA (add the version as a trailing comment):");
    for (const entry of bad) console.error(`  ${entry}`);
    process.exit(1);
  }
  console.log("ok   every workflow action is pinned to a commit SHA");
}
