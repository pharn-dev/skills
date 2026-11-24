---
spec_id: phargus-stalled-sample-not-gap
spec_content_hash: 192f319bce36ed34bed988afe17cf0a7917f9651822dd768c4df6f45e524a0d8
---

## Files

- `src/phargus/test/stalled-samples.test.mjs` — the tests for AC-1, AC-2 and AC-3 (run from `src/phargus` with `node --test`)

## Mapping

- AC-1 | unit | `src/phargus/test/stalled-samples.test.mjs` | src/phargus/runtime/records.mjs#quality(): Quality (fresh `stalledSamples` 0, `stalledMs` 0) and #qualityTracker(status: Quality, intervalMs: number): { add(record: Event): void } fed raw `sample` and `window` records (from parseRecord or `{event, data}`), asserting status.gaps, status.stalledSamples and status.stalledMs
- AC-2 | integration | `src/phargus/test/stalled-samples.test.mjs` | src/phargus/runtime/summary.mjs#summarizeEvents(events: AsyncIterable<Event>, source: string, status: Quality, intervalMs?: number): Promise<Summary> (or #summarizeFile(file, { manifest })) with conditions durationMs 30000 and intervalMs 1000, then #compareSummaries(before: Summary, after: Summary): { comparable: boolean, verdict: string, reasons: string[] }
- AC-3 | integration | `src/phargus/test/stalled-samples.test.mjs` | from src/phargus: `node scripts/generate.mjs --check` (npm run check:generated) exits 0 after the build; Quality in src/phargus/runtime/types.d.ts declares `stalledSamples: number` and `stalledMs: number`; text of src/phargus/knowledge/data.md and plugins/phargus/skills/*/references/data.md names both fields and lacks "A schedule gap can also result from a blocked loop"; src/phargus/knowledge/verification.md states that a late sample explained by its own stall does not make the comparison inconclusive
