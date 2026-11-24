// Compares the pharn-ci skills' references with pharn-ci's own schemas, so a skill that falls behind a release fails
// the tests. Pure functions over parsed JSON and Markdown text; Node core only, nothing read or written here.
//
// pharn-ci's schema/report.v2.json has no enum for message codes: `$defs.message.properties.code` is a string with a
// pattern. From 0.12.0 its description points to the code table in docs/output.md instead of listing the codes, so
// reportCodes reads the codes from that table: the first cell of each row, a code in backticks.

const CODE_ROW_RE = /^\|\s*`([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)`\s*\|/gm;

/** The codes in the first column of docs/output.md's code table, sorted and de-duplicated. */
export function reportCodes(outputMarkdown) {
  return [...new Set([...outputMarkdown.matchAll(CODE_ROW_RE)].map((m) => m[1]))].sort();
}

/** Every dotted key path under the schema's nested `properties`, in schema order. */
export function policyKeyPaths(schema, prefix = "", out = []) {
  if (schema && typeof schema === "object" && schema.properties && typeof schema.properties === "object") {
    for (const [key, sub] of Object.entries(schema.properties)) {
      const path = prefix ? `${prefix}.${key}` : key;
      out.push(path);
      policyKeyPaths(sub, path, out);
    }
  }
  return out;
}

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The codes that do not occur in `markdown` as a whole token (no letter, digit or `_` on either side). */
export function missingCodes(markdown, codes) {
  return codes.filter((code) => !new RegExp(`(?<![A-Za-z0-9_])${escape(code)}(?![A-Za-z0-9_])`).test(markdown));
}

/** The key paths that do not occur in `markdown` inside backticks as the exact dotted path. */
export function missingKeys(markdown, keyPaths) {
  return keyPaths.filter((path) => !markdown.includes(`\`${path}\``));
}
