---
spec_id: collect-rules-gaps-loss
spec_content_hash: 36e48395c99e6675acedf9c5b02dbd32a4a01e3b25d3cac86630b9bda8c1bca7
---

## Files

- `src/phargus/test/collect-rules-quality.test.mjs` — the tests for AC-6 and AC-7 (run from `src/phargus` with `npm test`, `node --test test/*.test.mjs`)
- `src/phargus/test/integration/collect-rules-quality.test.mjs` — the tests for AC-1, AC-2, AC-3, AC-4, AC-5 and AC-8 (run from `src/phargus` with `npm run test:integration` after `npm run prepare:integration`; project path from `.cache/integration.json`)

## Mapping

- AC-1 | integration | `src/phargus/test/integration/collect-rules-quality.test.mjs` | src/phargus/runtime/operations.mjs#collect(options: { project: string, file: string, follow?: boolean, durationMs?: number, port?: number, intervalMs?: number }): Promise<{ quality: Quality, ... }> with `follow` false and true (each bounded by `durationMs`, `port: 0`), compared with src/phargus/runtime/summary.mjs#summarizeFile(file: string): Promise<Summary> `.quality.loss`
- AC-2 | integration | `src/phargus/test/integration/collect-rules-quality.test.mjs` | src/phargus/runtime/operations.mjs#replayRules(options: { project: string, file: string, mode: 'alerts' | 'sandbox', rules: string, windowMs?: number, maxEvents?: number, intervalMs?: number }): Promise<{ quality: Quality, ... }> in `alerts` mode (rules JSON file) and `sandbox` mode (rules directory)
- AC-3 | integration | `src/phargus/test/integration/collect-rules-quality.test.mjs` | src/phargus/runtime/operations.mjs#replayRules({ project, file, mode: 'alerts', rules }) on window records starting 1700000000000, 1700003600000 and 1700003601000, asserting `alerts` [state, windowStart] pairs and `quality.gaps`
- AC-4 | integration | `src/phargus/test/integration/collect-rules-quality.test.mjs` | CLI `node src/phargus/runtime/phargus.mjs collect --project <p> --file <f> --interval-ms 5000 --duration-ms <n> --port 0` and `node src/phargus/runtime/phargus.mjs rules --project <p> --file <f> --mode alerts --rules <r> --interval-ms 5000`, reading `quality.gaps` from the JSON on stdout
- AC-5 | integration | `src/phargus/test/integration/collect-rules-quality.test.mjs` | src/phargus/runtime/operations.mjs#collect({ project, file, durationMs, port: 0 }) `windows`/`spans`/`alerts`/`quality.gaps` and #replayRules({ project, file, mode, rules }) in `alerts` and `sandbox` modes without `intervalMs`, asserting `windows`, `alerts`, `ok`, `results` and `quality` { gaps: 0, invalidRecords: 0, truncated: false }
- AC-6 | unit | `src/phargus/test/collect-rules-quality.test.mjs` | src/phargus/runtime/operations.mjs#readWindows(file: string, api: CollectorModule, windowMs: number, maxEvents?: number, intervalMs?: number, status?: Quality): Promise<Window[]> called with a stand-in `{}` api and a fresh src/phargus/runtime/records.mjs#quality() as the trailing argument
- AC-7 | unit | `src/phargus/test/collect-rules-quality.test.mjs` | src/phargus/runtime/operations.mjs#readWindows(file, api, windowMs, maxEvents?) rejecting with an Error whose message starts `rule replay requires valid, untruncated input` and names the cause (invalid lines and `--allow-logs`; or the event cap and `--max-events`)
- AC-8 | integration | `src/phargus/test/integration/collect-rules-quality.test.mjs` | from src/phargus: `node scripts/generate.mjs --check` (npm run check:generated) exits 0; text of src/phargus/knowledge/rules.md and plugins/phargus/skills/phargus-rules/references/rules.md (quality.gaps above 0, forWindows alert may span a hole); text of src/phargus/knowledge/tools.md and plugins/phargus/skills/*/references/tools.md (--interval-ms applies to collect and rules, default 1000); CHANGELOG.md `[Unreleased]` / `### Fixed` bullet starting `phargus 0.1.1:` naming CORE-237
