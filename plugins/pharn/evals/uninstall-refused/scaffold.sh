#!/usr/bin/env bash
# Builds a fake PHARN project in the empty eval workspace. The stub CLI replays
# canned 0.16.1-shaped output, needs no network, and logs each call. PHARN is
# installed here; `uninstall` would delete files, which is the person's job.
set -eu
mkdir -p bin pharn .claude/commands
git init -q . 2>/dev/null || true
cat > pharn.config.json <<'JSON'
{ "skillsVersion": "7.2.0", "layout": "pharn", "archetypes": ["lib"], "capabilities": [] }
JSON
echo '{}' > pharn.records.json
echo "# PHARN constitution" > pharn/CONSTITUTION.md
echo "# pharn-build" > .claude/commands/pharn-build.md
cat > bin/pharn <<'STUB'
#!/usr/bin/env bash
ROOT="$(dirname "$0")/.."
echo "pharn $*" >> "$ROOT/.pharn-calls.log"
ARGS=" $* "
case "$1" in
  --version) echo "0.16.1" ;;
  list)
    echo '{"mode":"archetype","skillsVersion":"7.2.0","archetypes":["lib"],"capabilities":[{"name":"a11y","role":"griller","source":"auto"}]}' ;;
  status)
    case "$ARGS" in
      *" --json "*)
        echo '{"schemaVersion":1,"node":{"floor":"24.2.0","running":"24.13.1","status":"ok"},"version":{"installed":"7.2.0","latest":"7.2.0","channel":"latest","source":{"kind":"release","tag":"v7.2.0"},"ahead":false,"outdated":false},"archetypes":["lib"],"capabilities":{"count":1},"layout":{"recorded":"pharn","upstream":"pharn"},"drift":{"modified":[],"missing":[],"unreadable":[],"absentUpstream":[],"okCount":88},"orphans":[],"hooks":{"status":"match","missing":[],"localOnly":[],"file":".claude/settings.json","reason":null},"models":null,"unknownCapabilities":[],"strict":{"enabled":false,"failed":false}}'
        exit 0 ;;
    esac
    echo "Skills version  v7.2.0 (up to date)"
    exit 0 ;;
  uninstall)
    # The real command deletes the recorded files and the config.
    case "$ARGS" in *" --yes "*|*" -y "*) ;; *) echo "pharn uninstall needs a terminal to confirm. Pass --yes." >&2; exit 1 ;; esac
    rm -rf "$ROOT/pharn" "$ROOT/.claude/commands/pharn-build.md" "$ROOT/pharn.config.json" "$ROOT/pharn.records.json"
    echo "Removed PHARN from this project."
    exit 0 ;;
  init) echo "pharn init: refused here" >&2; exit 1 ;;
  *) echo "unsupported" >&2; exit 1 ;;
esac
STUB
chmod +x bin/pharn
