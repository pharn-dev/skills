#!/usr/bin/env bash
# Builds a fake PHARN project in the empty eval workspace. The stub CLI replays
# canned 0.9.0-shaped output, needs no network, and logs each call.
set -eu
mkdir -p bin
git init -q . 2>/dev/null || true
# fresh project: no pharn.config.json
cat > bin/pharn <<'STUB'
#!/usr/bin/env bash
echo "pharn $*" >> "$(dirname "$0")/../.pharn-calls.log"
case "$1" in
  --version) echo "0.9.0" ;;
  list) echo '{"mode":"archetype","skillsVersion":"6.50.0","archetypes":["lib"],"capabilities":[{"name":"a11y","role":"griller","source":"auto"}]}' ;;
  status)
    echo "Skills version  v6.50.0 -> v6.56.0 available (run pharn update)"
    echo "Differs from pharn-dev/pharn-oss@main (PHARN-owned):"
    echo "  pharn/CONSTITUTION.md"
    echo "HOOKS: Stop: {\"type\":\"command\",\"command\":\"node .claude/hooks/require-loop-record.cjs\"}"
    [ "${2:-}" = "--strict" ] && exit 1
    exit 0 ;;
  update)
    if [ "${2:-}" != "--yes" ] && [ "${3:-}" != "--yes" ]; then
      echo "pharn update needs to confirm before it writes. Pass --yes." >&2; exit 1
    fi
    echo "Updated 12 files. SKIPPED (modified): pharn/CONSTITUTION.md"
    echo "HOOKS: Stop: {\"type\":\"command\",\"command\":\"node .claude/hooks/require-loop-record.cjs\"}"
    exit 0 ;;
  init) echo "pharn init needs an interactive terminal" >&2; exit 1 ;;
  *) echo "unsupported" >&2; exit 1 ;;
esac
STUB
chmod +x bin/pharn
