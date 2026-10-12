#!/usr/bin/env bash
# Builds a fake PHARN project in the empty eval workspace with no pharn CLI:
# no ./bin/pharn and no node_modules. Assumes the machine running the eval has
# no `pharn` on PATH and no cached @pharn-dev/pharn for `npx --no-install`.
set -eu
git init -q . 2>/dev/null || true
cat > pharn.config.json <<'JSON'
{ "skillsVersion": "6.50.0", "layout": "pharn", "archetypes": ["lib"], "capabilities": [] }
JSON
