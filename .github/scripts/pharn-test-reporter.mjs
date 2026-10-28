// A node:test custom reporter that writes PHARN's `pharn-json` per-test results.
//
// Contract: pharn/pharn-contracts/test-results-record.md, "The neutral format". The document is exactly
//   { "schema": "pharn-test-results/1", "suite_errors": <n>, "tests": [{ "file", "path", "status" }] }
// with `status` one of passed, failed, skipped.
//
// It writes only to the file named by the PHARN_TEST_RESULTS environment variable, and only when that
// variable is a non-empty string. With it unset the reporter writes nothing anywhere, and it yields nothing
// to its own stream, so a separate reporter (`spec`) owns the terminal output.
import { writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "pharn-test-results/1";

// `data.file` is absolute; report it relative to the working directory, with POSIX separators,
// whenever it lies under it. A file outside the working directory keeps its absolute path.
function relativeFile(file, cwd) {
  const relative = path.relative(cwd, file);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return file;
  return relative.split(path.sep).join("/");
}

// node:test consumes a reporter as an async generator; this one yields nothing on purpose.
// eslint-disable-next-line require-yield
export default async function* pharnTestReporter(source) {
  const cwd = process.cwd();
  const stacks = new Map();
  const tests = [];
  let suiteErrors = 0;

  const stackOf = (file) => {
    let stack = stacks.get(file);
    if (stack === undefined) {
      stack = [];
      stacks.set(file, stack);
    }
    return stack;
  };

  for await (const { type, data } of source) {
    if (type === "test:start") {
      if (typeof data.file !== "string") continue;
      const stack = stackOf(data.file);
      stack.length = data.nesting;
      stack.push(data.name);
      continue;
    }
    if (type !== "test:pass" && type !== "test:fail") continue;

    const failed = type === "test:fail";
    const file = data.file;
    if (typeof file !== "string") {
      // A failure no file owns cannot be an entry; count it so it is never silently dropped.
      if (failed) suiteErrors += 1;
      continue;
    }

    const relative = relativeFile(file, cwd);
    // Node wraps each file in a file-level test named for the file, at nesting 0.
    const isFileLevel = data.nesting === 0 && (data.name === relative || data.name === file);
    if (isFileLevel) {
      if (failed) suiteErrors += 1;
      continue;
    }

    if (data.details?.type === "suite") {
      // A describe is never an entry. A failed one counts only when no test beneath it owns the failure.
      if (failed && data.details?.error?.failureType !== "subtestsFailed") suiteErrors += 1;
      continue;
    }

    const stack = stackOf(file);
    let status;
    if (failed) status = data.todo !== undefined && data.todo !== false ? "skipped" : "failed";
    else if (data.skip !== undefined && data.skip !== false) status = "skipped";
    else if (data.todo !== undefined && data.todo !== false) status = "skipped";
    else status = "passed";

    tests.push({
      file: relative,
      path: [...stack.slice(0, data.nesting), data.name],
      status,
    });
  }

  const target = process.env.PHARN_TEST_RESULTS;
  if (typeof target === "string" && target !== "") {
    writeFileSync(target, `${JSON.stringify({ schema: SCHEMA, suite_errors: suiteErrors, tests })}\n`);
  }
}
