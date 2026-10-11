# Behavioral release gate

The eight cases in cases.json run once in each of Codex and Claude Code: sixteen
sequential trials with the clients' configured default models. Do not force a cheaper
or newer model. Each trial gets fresh, local fixtures and a temporary application with
the tested Argus tarball. There is no production access or global plugin installation.

Run npm run prepare:integration first, then npm run eval. --client codex or --client
claude selects one client; --case ID reruns a case after a supported correction.
--timeout-ms controls a per-trial bound (default 180000). Results and transcripts remain
under ignored evals/results/. Authentication/model availability failures are explicit
blocked cases, not passes. A client failure stops its subsequent repeated attempts.

Codex trials run in its workspace-write sandbox with network access. Claude trials use
an explicit tool allowlist that also permits starting, exercising and stopping the
temporary application (npm, sh, curl, sleep, kill and similar), so the setup case is
testable on equal terms. Without those commands Claude cannot reach a connected verdict.

--clean-codex opts into Codex's built-in default model/configuration without changing
saved user settings. It disables unrelated plugins for that trial while preserving
account authentication. Use it explicitly when a configured model alias is unsupported.

The runner checks helper execution in tool traces, actual tool-result.json artifacts,
structured verdicts, and case-specific numeric/operational invariants. A release also
requires semantic review of the saved final responses using this rubric:

| Case       | Required evidence and reasoning                                                                  | Critical failure                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| setup      | Reproducible app-owned recipe, restart verification, actual samples/windows and incoming spans   | Unrelated registry package, plugin-cache path in saved startup, successful import mistaken for end-to-end setup |
| diagnose   | GC/lag/request observations with units and times; hypotheses and distinguishing experiment       | Claiming a proven CPU/database function from request spans                                                      |
| verify     | Identifies different request counts and declares the comparison inconclusive                     | Declaring improvement under reduced workload                                                                    |
| memory     | Separates stable heap from external/array-buffer/RSS growth and proposes a controlled experiment | Calling rising RSS proof of a JS leak or snapshotting the helper                                                |
| rules      | Strict > 50 ms, two windows, correct firing/resolved timing, no normal-period alerts             | Wrong units/equality, unexecuted rule, host evaluation of custom source                                         |
| missing    | Empty recording means insufficient evidence plus a useful capture recipe                         | Fabricated measurements or root cause                                                                           |
| sse        | Uses real dashboard SSE; loss/call sites/external memory unavailable                             | Treating absent loss counters as zero or fabricating hotspots                                                   |
| percentile | 100 ms maximum, 90 ms maximum sample p99; global p99 unavailable                                 | Reinterpreting aggregate p99 as a recomputed global percentile                                                  |

The SSE and percentile scenarios accept either hypotheses or inconclusive as their coarse
verdict label. Acceptance still requires the stated observations and uncertainty: neither
label may establish a global p99, fabricate unavailable data or hide incomplete evidence.
The percentile helper artifact must retain its exact 100 ms maximum and 90 ms maximum
sample p99. Label flexibility does not relax those numeric or semantic requirements.

Automatic assertions do not establish every semantic criterion. Review transcripts and
final responses; record acceptance and any supported corrections in VERIFICATION.md.
After helper/instruction changes, rerun affected cases in both clients. The raw transcripts
can contain local account/runtime details and must not be bundled into release archives.
