# Phargus skills

Sources and tooling for the `phargus` plugin of pharn-dev/skills: portable skills for
users of Phargus, independent of the Phargus runtime repository. Run commands from src/phargus.
Use npm; commit package-lock.json. Runtime helpers import Node core only and run
without installing this repository's development dependencies. Keep .mjs helpers
checked by TypeScript strict/checkJs; do not use unvalidated dynamic module exports.

The plugin lives in plugins/phargus/ at the repository root, next to other plugins; the
root marketplaces are shared and maintained by hand. Author skill instructions in
plugins/phargus/skills/*/SKILL.md. Edit shared references in knowledge/ and helpers in
runtime/, then run npm run build. Copied scripts/references, the plugin LICENSE and the
plugin manifests are generated and committed; never patch one copy in isolation. Keep the plugin in a real subdirectory without symlinks:
Codex drops a marketplace whose plugin path is its own root and skips symlinks.

Before checks run npm run format. Required checks: npm run lint, npm run typecheck,
npm test, npm run check:generated, npm run check:skills, npm run check:package,
npm run format:check. Integration: npm run prepare:integration then
npm run test:integration. Model trials: npm run eval, using installed/authenticated
clients; keep raw results in ignored evals/results, not published artifacts.

Maintain compatibility.json and API references against the tested upstream commit.
prepare:integration defaults to an Phargus checkout next to the skills repository;
pass --source /path/to/phargus for another.
Tests build the pinned revision in .cache without editing upstream sources.
Native isolated-vm must match the test Node ABI. Never treat failed sandbox runs as
successful empty findings. Preserve unknown loss and Phargus's actual metric semantics.

Conventional commits; release manually. Do not publish npm packages or plugin directory
listings as part of ordinary edits. Apache-2.0, Copyright 2026 Przemek Galarowicz.
