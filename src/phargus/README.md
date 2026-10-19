# Phargus skills

Agent skills for Codex and Claude Code: Phargus setup, Node.js runtime diagnostics,
memory analysis, fix verification, and alert rules. This directory holds the sources
and tooling for the `phargus` plugin in [pharn-dev/skills](https://github.com/pharn-dev/skills);
the plugin itself is generated into plugins/phargus/ at the repository root.

Status: 0.1.1 development draft. Deterministic checks pass; no behavioral review is
recorded for the shipped content, so npm run check:evals fails. See
[VERIFICATION.md](VERIFICATION.md).

Five workflows share one tested Phargus contract. Each skill includes its own references
and Node-core-only helpers, so a single copied skill works without this checkout or its
development dependencies. No MCP server or hosted account is required by the tools.
Using Codex or Claude Code itself requires the corresponding installed, authenticated client.

## Install

### Codex plugin

```bash
codex plugin marketplace add pharn-dev/skills
codex plugin add phargus@pharn-dev
```

For local development, replace the Git repository with the skills checkout's absolute
path. The plugin lives in plugins/phargus/ with a portable plugin.json; the repository root
holds the Codex and Claude marketplaces, shared with the other plugins there. Codex
ignores a marketplace whose plugin path is its own root and does not copy symlinks, so
keep that layout. In the desktop app, add the local marketplace, enable Phargus and start
a new conversation if discovery has not refreshed. Public directory submission is separate from Git installation.

### Claude Code plugin

```bash
claude plugin marketplace add pharn-dev/skills
claude plugin install phargus@pharn-dev
```

For local development use claude --plugin-dir /absolute/path/to/skills/plugins/phargus.
Plugin skills are namespaced, for example /phargus:phargus-diagnose.

The marketplace was previously published from pharn-dev/argus-ai as argus-ai@pharn-dev,
under the same marketplace name. Remove that marketplace before adding pharn-dev/skills.

For the Argus rename, uninstall argus@pharn-dev before installing phargus@pharn-dev;
the plugin identity changed. Replace any standalone `argus-*` skill directories with
the corresponding `phargus-*` directories. Application recipes now use
@pharn-dev/phargus imports, PHARGUS_* variables, phargus.config.json/js and .phargus/.
Migrate those recipes after installing a compatible renamed runtime.

### One standalone skill

Copy a complete plugins/phargus/skills/phargus-diagnose directory into the target application's
.agents/skills/ for Codex, or .claude/skills/ for Claude Code. User-wide locations are
~/.agents/skills/ and ~/.claude/skills/. Choose the other workflow directories as needed.
Copy plugins/phargus/LICENSE with redistributed skills; release ZIPs already include it.
The standalone directory includes its scripts and references; do not copy SKILL.md alone.

Use native marketplace upgrade/update commands to update plugins. Replace complete
standalone directories from the same release to update copied skills. Avoid installing
both plugin and standalone copies of the same workflow in the same client.

## Workflows

| Skill            | Example request                                              | Result                                           |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| phargus-setup    | Connect Phargus to this application and verify the dashboard | Reproducible startup, observed samples and spans |
| phargus-diagnose | Investigate slow requests using this recording               | Evidence, hypotheses and next experiment         |
| phargus-verify   | Check whether this performance fix helped                    | Controlled before/after comparison               |
| phargus-memory   | Investigate growing RSS and these snapshots                  | Memory categories, snapshot diffs and limits     |
| phargus-rules    | Alert on sustained lag and replay these recordings           | Executable, tested rules and activation recipe   |

Skills can be selected automatically from their descriptions or invoked explicitly.
Codex standalone examples use $phargus-diagnose; Claude standalone uses /phargus-diagnose.
Metadata and SKILL.md bodies are shared; there are no Claude-specific substitutions.

## Tools and data

Requires Node >=22.18.0. See knowledge/tools.md for command options and knowledge/data.md
for units and evidence limitations. Installed copies contain these under references/.
Run the examples from the skills repository root.

```bash
node plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs summarize --file /captures/raw.ndjson
node plugins/phargus/skills/phargus-diagnose/scripts/phargus.mjs capture --url http://127.0.0.1:7070/events --out /captures/live
node plugins/phargus/skills/phargus-memory/scripts/phargus.mjs heap --project /path/to/app --before /captures/a.heapsnapshot --after /captures/b.heapsnapshot
```

Commands emit JSON with schemaVersion: 1 on stdout; redirect it to the result file you
need, since .phargus/ holds captures, not results. SSE reads default to 30 seconds and 10,000
events; summarize and compare read files without an event-count cap unless --max-events
is given. Provide --token-env PHARGUS_DASHBOARD_TOKEN when authentication is enabled;
tokens are never embedded in artifact URLs or reported configuration.
Capture artifacts preserve source/quality metadata. SSE history classification is an
event-time estimate, and raw-loss counters remain unknown; it cannot establish a
complete controlled performance comparison by itself.

Phargus is tested at release tag v0.1.0 (commit 819a795875fc547e7daeccc0f0b50846ba642286),
package @pharn-dev/phargus version 0.1.0, which is published on npm. Install it in the
application with npm install @pharn-dev/phargus@0.1.0. The helpers accept installed
versions >=0.1.0 <0.2.0. See [the tested contract](knowledge/compatibility.md) and
[verification](VERIFICATION.md).
doctor, collect, heap and rules resolve the application's package using --project.
--phargus-package supports an installed alias. summarize, compare and capture need no
Phargus dependency. Sandbox rules additionally require the optional isolated-vm peer.

## Develop and verify

```bash
npm ci
npm run format
npm run build
npm run check:generated
npm run check:skills
npm run lint
npm run typecheck
npm test
npm run prepare:integration
npm run test:integration
npm run check:package
npm run format:check
npm run eval
npm run review:evals -- --run ID --client C --case ID --reviewer GITHUB-HANDLE --accept
npm run check:evals
npm run package
```

Run these from src/phargus. Shared reference sources live in knowledge/, helpers in runtime/
and plugin identity in catalog.json; the publisher, repository and license are set in
scripts/generate.mjs. npm run build copies resources into every standalone
skill under ../../plugins/phargus and generates the plugin manifests. The marketplaces at
the repository root are maintained by hand and checked by check:skills. Generated files
are committed; CI rejects stale copies. prepare:integration builds the pinned Phargus
from a Phargus checkout next to the skills repository unless --source names another.
Use --reuse-dependencies with prepare:integration only for local development against an
existing matching Node installation; CI installs fresh dependencies for each Node version.

The release model gate runs eight cases in each client, sequentially, with client-default
models. See evals/README.md for rubrics and results. It runs on local fixtures and temporary
applications; no production captures or global plugin installation are part of the tests.
The CLI outputs and artifacts establish execution; semantic judgments use the saved rubric.
Missing client access is a blocked release gate, not a passed or silently skipped evaluation.

Use npm run eval -- --clean-codex only when explicitly choosing Codex's built-in default
configuration for a trial. It leaves saved user settings unchanged. The runner, not a
person, writes every trial into VERIFICATION.json with redacted evidence under
verification/<run>/; a human reviewer signs each trial off with npm run review:evals under
their GitHub handle. npm run check:evals fails until all sixteen cases have accepted trials
for the current fingerprint with intact evidence. VERIFICATION.md describes the process
and current outcomes. The 0.1.0 and pre-rename records in verification/ are self-attested
history. Draft archives can still be built for inspection; their release.json records the
blocked behavioral gate. Archives leave out the per-run evidence.

Release ZIPs and release.json are produced in ignored dist/. This package is private;
it is distributed through Git and plugin/skill archives, not npm. Tag (`phargus-vX.Y.Z`, see
Releasing in ../../CONTRIBUTING.md) and publish only after the deterministic checks and the
model gate pass.

## License

Apache-2.0. Copyright 2026 Przemek Galarowicz. See LICENSE.
