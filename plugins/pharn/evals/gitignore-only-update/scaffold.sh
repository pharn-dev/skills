#!/usr/bin/env bash
# Builds a fake PHARN project in the empty eval workspace. The stub CLI replays
# canned 0.16.1-shaped output, needs no network, and logs each call.
# The install is current (skills 7.2.0, upstream 7.2.0) but .gitignore lacks
# pharn/.run/ and pharn/.backup/, so the dry run is `planned` at the same
# version with nothing in plan.writes and only plan.gitignore to apply. This
# case keeps its own copy: it shares no stub with the 0.11.0 cases CI compares.
set -eu
mkdir -p bin
git init -q . 2>/dev/null || true
cat > pharn.config.json <<'JSON'
{ "skillsVersion": "7.2.0", "layout": "pharn", "archetypes": ["lib"], "capabilities": [] }
JSON
printf 'node_modules/\ndist/\n' > .gitignore
cat > bin/pharn <<'STUB'
#!/usr/bin/env bash
ROOT="$(dirname "$0")/.."
echo "pharn $*" >> "$ROOT/.pharn-calls.log"
ARGS=" $* "
# The project's .gitignore covers both lines once `update --yes` has run.
COVERED=false
grep -qx 'pharn/.run/' "$ROOT/.gitignore" 2>/dev/null && grep -qx 'pharn/.backup/' "$ROOT/.gitignore" 2>/dev/null && COVERED=true
case "$1" in
  --version) echo "0.16.1" ;;
  list)
    echo '{"mode":"archetype","skillsVersion":"7.2.0","archetypes":["lib"],"capabilities":[{"name":"a11y","role":"griller","source":"auto"}]}' ;;
  status)
    case "$ARGS" in
      *" --json "*)
        ST=false; case "$ARGS" in *" --strict "*) ST=true ;; esac
        echo '{"schemaVersion":1,"node":{"floor":"24.2.0","running":"24.13.1","status":"ok"},"version":{"installed":"7.2.0","latest":"7.2.0","channel":"latest","source":{"kind":"release","tag":"v7.2.0"},"ahead":false,"outdated":false},"archetypes":["lib"],"capabilities":{"count":1},"layout":{"recorded":"pharn","upstream":"pharn"},"drift":{"modified":[],"missing":[],"unreadable":[],"absentUpstream":[],"okCount":88},"orphans":[],"hooks":{"status":"match","missing":[],"localOnly":[],"file":".claude/settings.json","reason":null},"models":null,"unknownCapabilities":[],"strict":{"enabled":'$ST',"failed":false}}'
        exit 0 ;;
    esac
    echo "Skills version  v7.2.0 (up to date)"
    exit 0 ;;
  update)
    case "$ARGS" in
      *" --dry-run "*)
        if [ "$COVERED" = true ]; then
          echo '{"schemaVersion":1,"command":"update","dryRun":true,"status":"up-to-date","force":false,"channel":"latest","channelChange":null,"source":{"kind":"release","tag":"v7.2.0"},"version":{"installed":"7.2.0","latest":"7.2.0","recorded":null,"withheld":null,"pending":null},"archetypes":["lib"],"plan":null}'
          exit 0
        fi
        echo '{"schemaVersion":1,"command":"update","dryRun":true,"compact":true,"status":"planned","force":false,"channel":"latest","channelChange":null,"source":{"kind":"release","tag":"v7.2.0"},"version":{"installed":"7.2.0","latest":"7.2.0","recorded":"7.2.0","withheld":false,"pending":null},"archetypes":["lib"],"plan":{"layout":"pharn","abandonedLayout":null,"featuresReadmeRelocation":false,"rootMigration":null,"capabilities":{"count":1,"changes":[]},"files":[],"filesOmitted":{"action":"noop","count":88},"writes":[],"backups":[],"skipped":[],"counts":{"updated":0,"restored":0,"ok":88,"forced":0,"skipped":0},"models":{"outcome":"ok","label":null,"replacedLegacyDefault":false,"backup":false,"conversion":null,"problems":[],"upstreamReasons":[]},"hooks":{"status":"match","missing":[],"localOnly":[],"file":".claude/settings.json","reason":null},"frozenCapabilities":[],"unknownCapabilities":[],"recordsNote":null,"gitignore":{"action":"append","entries":["pharn/.run/","pharn/.backup/"]}}}'
        exit 0 ;;
    esac
    case "$ARGS" in *" --json "*) echo "Incomplete option for update: --json needs --dry-run" >&2; exit 1 ;; esac
    case "$ARGS" in *" --yes "*) ;; *) echo "pharn update needs to confirm before it writes. Pass --yes." >&2; exit 1 ;; esac
    if [ "$COVERED" = true ]; then
      echo "Already up to date (skills v7.2.0)."
      exit 0
    fi
    printf '\n# PHARN run state and update backups (added by pharn)\npharn/.run/\npharn/.backup/\n' >> "$ROOT/.gitignore"
    echo "Skills v7.2.0 is current: no files to write."
    echo "Added pharn/.run/, pharn/.backup/ to .gitignore."
    exit 0 ;;
  init) echo "pharn init: refused here" >&2; exit 1 ;;
  *) echo "unsupported" >&2; exit 1 ;;
esac
STUB
chmod +x bin/pharn
