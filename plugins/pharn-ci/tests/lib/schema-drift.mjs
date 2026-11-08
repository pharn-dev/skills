// Compares the pharn-ci skills' references with pharn-ci's own schemas, so a skill that falls behind a release fails
// the tests. Pure functions over parsed JSON and Markdown text; Node core only, nothing read or written here.
//
// pharn-ci's schema/report.v2.json has no enum for message codes: `$defs.message.properties.code` is a string with a
// pattern, and the known codes are listed in that property's description. reportCodes reads that list.

const CODE_RE = /(?<![A-Za-z0-9_])[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+(?![A-Za-z0-9_])/g;

/** The codes named in the report schema's code description, sorted and de-duplicated. */
export function reportCodes(schema) {
  const description = schema?.$defs?.message?.properties?.code?.description;
  if (typeof description !== "string") throw new TypeError("the schema has no $defs.message.properties.code.description");
  return [...new Set(description.match(CODE_RE) ?? [])].sort();
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
