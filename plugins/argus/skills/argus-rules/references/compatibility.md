# Tested Argus contract

Tested against pharn-dev/argus commit a69d644383efe19c82fb3cfdee83a0ad1dd5e0f9,
package version 0.0.1, on Node >=22.18.0. Argus was not published at this commit;
the npm name argus belongs to another package. Do not install it from the registry.

Build the pinned source with npm ci and npm pack, then install its tarball in the
application. The tools take --project pointing to that application and optionally
--argus-package for an explicitly installed package alias. Resolve modules there,
not in the skill checkout. Doctor resolves exports without importing argus/agent.

Argus exports agent, collector, analyzer, dashboard, plugin-runner and otel.
Importing argus/agent starts monitoring the importing process. Use it only in the
application being observed; importing it in a helper does not attach to another PID.

Collector: createCollector({ windowMs, capacity, alerts? }); consume(parsedRecords),
windows.snapshot(), spans.snapshot(), alerts.snapshot(), close().
Dashboard: createDashboardServer({ collector, host, port, token? }); close().
Analyzer: summarizeHeapSnapshot(path), diffHeapSnapshots(before, after).
Plugin runner: createPluginRunner(), loadRulesDirectory(dir), runRules(runner, rules, windows).

The agent never starts a server. There is no snapshot, profiler or metrics REST API.
The dashboard offers GET /events (SSE), not an MCP endpoint. Incoming HTTP/HTTPS
requests are traced; outgoing requests, database calls, queue jobs and HTTP/2 have
no separate spans. Worker and process boundaries require explicit trace propagation.

isolated-vm is an optional peer dependency needed only for sandbox rules. Allocation
sampling and snapshots are library operations inside the monitored process.
createDeoptParser parses supplied node --trace-deopt output; it does not capture it.

Runtime checks establish version and required exports, not the source commit of an
arbitrary installed tarball. The report says sourceCommitVerified: false; the release
integration suite establishes the pinned-source compatibility separately.
