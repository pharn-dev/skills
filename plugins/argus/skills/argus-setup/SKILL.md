---
name: argus-setup
description: Install, connect, and verify Argus diagnostics in a Node.js application. Use when adding Argus, configuring agent output, or repairing the agent-to-collector-to-dashboard connection.
license: Apache-2.0
compatibility: Node.js >=22.18.0; access to the target application and a compatible Argus tarball or source checkout.
---

# Argus Setup

Connect Argus to the actual application and leave a reproducible start recipe.
Read [compatibility](references/compatibility.md) before selecting a package and
[setup](references/setup.md) for the integration procedure. Use
[tools](references/tools.md) for bundled command options.

1. Inspect the application, its start command, module format, Node version and logging.
   Resolve the absolute directory of this SKILL.md; run scripts/argus.mjs from that
   directory, with --project pointing to the application.
2. Use doctor to inspect an existing installation. Install the tested source tarball
   when needed; the npm name argus is unrelated at the tested pre-release commit.
3. Configure early preload and a dedicated NDJSON file. Create a portable application-side
   collector recipe by copying the bundled scripts directory; save commands using those
   application-owned paths, not plugin-cache paths.
4. Start the application and collector, exercise a suitable existing endpoint/workload,
   capture SSE, and inspect actual samples and incoming spans. Read
   [data semantics](references/data.md) when interpreting that verification.
5. Restart with the saved recipe and verify again. Clean up test processes you started.

Return the changed files, reproducible launch commands and observed data proving the
connection. Report missing requirements or incomplete verification explicitly.

Example request: "Add Argus to this Express app and show that its dashboard receives data."
