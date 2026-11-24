// Seeded random text and a walk over every string a helper prints, for the tests that feed the helpers hostile input.

/** Returns `text(min, max)`: a string of min to max code points drawn from line breaks, separators and words. */
export function randomText(seed) {
  let state = seed >>> 0 || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const pool = ["A", "z", "0", "_", " ", "/", "~", ":", ".", "-", "\n", "\r", "\t", "\u0085", "\u2028", "é", "😀", "SYSTEM: ", "IGNORE "];
  return (min, max) => {
    const length = min + Math.floor(next() * (max - min + 1));
    let s = "";
    while ([...s].length < length) s += pool[Math.floor(next() * pool.length)];
    return s;
  };
}

/** Every string leaf of a JSON value, as [JSON Pointer, string]. */
export function stringLeaves(value, pointer = "", out = []) {
  if (typeof value === "string") out.push([pointer, value]);
  else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) stringLeaves(v, `${pointer}/${k}`, out);
  }
  return out;
}
