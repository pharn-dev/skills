import { realpathSync } from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';

/**
 * Redaction of model-trial evidence before it is committed under verification/. Trials run in
 * temporary applications under the reviewer's account, so final responses, helper output and
 * commands can carry absolute home/temp paths, the user name and environment secrets.
 * @typedef {{literals: [string, string][], user: string | undefined}} RedactionContext
 */

/** Environment variable names whose values are treated as secrets. */
const SECRET_ENV =
  /TOKEN|SECRET|PASSW(?:OR)?D|API_?KEY|ACCESS_KEY|_KEY$|PRIVATE|CREDENTIAL|SESSION|COOKIE|AUTH/i;
/** Object keys whose string values are treated as secrets; names such as tokenEnv are kept. */
const SECRET_KEY = /(?:token|secret|passw(?:or)?d|api[-_]?key|authorization|cookie|credentials?)$/i;
/** An environment variable name, as reported in place of a secret (for example --token-env). */
const ENV_NAME = /^[A-Z][A-Z0-9_]*$/;

/** Secret-looking strings and other users' paths that no literal covers. @type {[RegExp, string][]} */
const PATTERNS = [
  [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g, '<redacted>'],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, '<redacted>'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, '<redacted>'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '<redacted>'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '<redacted>'],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 <redacted>'],
  [
    /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|ACCESS_KEY|PRIVATE_KEY|CREDENTIALS?)[A-Z0-9_]*)(\s*[=:]\s*)(["']?)(?!<)[^\s"'&,;]{4,}\3/g,
    '$1$2$3<redacted>$3',
  ],
  [
    /([?&](?:access_token|token|api_key|apikey|key|secret|password|auth)=)(?!<)[^&\s"'#]+/gi,
    '$1<redacted>',
  ],
  [/\b(x-api-key|api-key)(\s*:\s*)[^\s"',;]+/gi, '$1$2<redacted>'],
  [/(\/(?:Users|home))\/[^/\s"'<>]+/g, '$1/<user>'],
  [/([A-Za-z]:\\Users\\)[^\\\s"'<>]+/g, '$1<user>'],
  [/(?:\/private)?\/var\/folders\/[^/\s"'<>]+\/[^/\s"'<>]+\/[TC](?=\/|\b)/g, '<tmp>'],
];

/** @param {string} value */
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The user name as a whole word, not inside another identifier or a placeholder. @param {string} user */
const userWord = (user) =>
  new RegExp('(?<![A-Za-z0-9_.<-])' + escape(user) + '(?![A-Za-z0-9_>-])', 'g');

function currentUser() {
  try {
    return userInfo().username;
  } catch {
    return undefined;
  }
}

/**
 * Build the literals to replace: the given paths (and their real paths, since macOS reports
 * /var/folders for /private/var/folders), the temp and home directories, and the values of
 * secret-named environment variables. Longer literals are replaced first so a trial project
 * inside the temp directory becomes <project>, not <tmp>/phargus-eval-….
 * @param {{paths?: [string, string][], env?: Record<string, string | undefined>, home?: string, tmp?: string, user?: string}} [options]
 * @returns {RedactionContext}
 */
export function redactionContext(options = {}) {
  const env = options.env ?? process.env;
  /** @type {Map<string, string>} */ const literals = new Map();
  /** @param {string | undefined} path @param {string} placeholder */
  function addPath(path, placeholder) {
    if (!path) return;
    // macOS reports /var and /tmp for paths whose real location is under /private.
    const aliases = /^\/(?:var|tmp)\//.test(path + '/') ? ['/private' + path] : [];
    for (let variant of [path, realpath(path), ...aliases]) {
      variant = variant?.replace(/[\\/]+$/, '');
      if (variant && variant.length > 1 && !literals.has(variant))
        literals.set(variant, placeholder);
    }
  }
  for (const [path, placeholder] of options.paths ?? []) addPath(path, placeholder);
  addPath(options.tmp ?? tmpdir(), '<tmp>');
  addPath(options.home ?? homedir(), '<home>');
  for (const [name, value] of Object.entries(env))
    if (value && value.length >= 8 && SECRET_ENV.test(name) && !literals.has(value))
      literals.set(value, '<redacted:' + name + '>');
  const user = options.user ?? currentUser();
  return {
    literals: [...literals].sort((a, b) => b[0].length - a[0].length),
    user: user && user.length >= 3 ? user : undefined,
  };
}

/** @param {string} path */
function realpath(path) {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}

/** @param {string} text @param {RedactionContext} context */
export function redactText(text, context) {
  let result = text;
  for (const [value, placeholder] of context.literals)
    result = result.split(value).join(placeholder);
  if (context.user) result = result.replace(userWord(context.user), '<user>');
  for (const [pattern, replacement] of PATTERNS) result = result.replace(pattern, replacement);
  return result;
}

/**
 * Redact every string and object key of a JSON value. A string under a secret-named key is
 * replaced entirely unless it is an environment variable name.
 * @param {unknown} value @param {RedactionContext} context @returns {unknown}
 */
export function redactJson(value, context) {
  if (typeof value === 'string') return redactText(value, context);
  if (Array.isArray(value)) return value.map((item) => redactJson(item, context));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        redactText(key, context),
        typeof item === 'string' && SECRET_KEY.test(key) && !ENV_NAME.test(item)
          ? '<redacted>'
          : redactJson(item, context),
      ]),
    );
  return value;
}

/**
 * Name what redaction left behind in serialized evidence: a literal's placeholder, the user name
 * or a secret pattern. The values themselves are never returned.
 * @param {string} text @param {RedactionContext} context @returns {string[]}
 */
export function leaks(text, context) {
  /** @type {Set<string>} */ const found = new Set();
  for (const [value, placeholder] of context.literals)
    if (text.includes(value)) found.add(placeholder);
  if (context.user && userWord(context.user).test(text)) found.add('<user>');
  for (const [pattern] of PATTERNS.slice(0, 5))
    if (new RegExp(pattern.source, pattern.flags.replace('g', '')).test(text))
      found.add('secret-looking token');
  return [...found];
}

/** Serialize redacted JSON evidence, refusing to return text that still leaks. @param {unknown} value @param {RedactionContext} context */
export function redactedEvidence(value, context) {
  const text = JSON.stringify(redactJson(value, context), null, 2) + '\n';
  const left = leaks(text, context);
  if (left.length) throw new Error('redaction left ' + left.join(', ') + ' in evidence');
  return text;
}
