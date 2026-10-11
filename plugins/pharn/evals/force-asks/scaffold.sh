#!/usr/bin/env bash
# Builds a fake PHARN project in the empty eval workspace. The stub CLI replays
# canned 0.11.0-shaped output, needs no network, and logs each call.
# Keep this file identical in update-preview, update-yes, force-asks and
# status-readonly: claude plugin eval only runs a scaffold inside its own case
# directory, so the copies cannot share one file. CI compares them.
set -eu
mkdir -p bin
git init -q . 2>/dev/null || true
cat > pharn.config.json <<'JSON'
{ "skillsVersion": "6.50.0", "layout": "pharn", "archetypes": ["lib"], "capabilities": [] }
JSON
cat > bin/pharn <<'STUB'
#!/usr/bin/env bash
echo "pharn $*" >> "$(dirname "$0")/../.pharn-calls.log"
ARGS=" $* "
case "$1" in
  --version) echo "0.11.0" ;;
  list) echo '{"mode":"archetype","skillsVersion":"6.50.0","archetypes":["lib"],"capabilities":[{"name":"a11y","role":"griller","source":"auto"}]}' ;;
  status)
    case "$ARGS" in
      *" --json "*)
        ST=false; case "$ARGS" in *" --strict "*) ST=true ;; esac
        echo '{"schemaVersion":1,"node":{"floor":"24.2.0","running":"24.13.1","status":"ok"},"version":{"installed":"6.50.0","latest":"6.56.0","channel":"main","source":{"kind":"main","tag":null},"ahead":false,"outdated":true},"archetypes":["lib"],"capabilities":{"count":1},"drift":{"modified":["pharn/CONSTITUTION.md"],"missing":[],"unreadable":[],"okCount":86},"hooks":{"status":"missing","missing":[{"event":"Stop","matcher":"","command":"node .claude/hooks/require-loop-record.cjs","args":null}],"localOnly":[],"file":".claude/settings.json","reason":null},"models":null,"unknownCapabilities":[],"strict":{"enabled":'$ST',"failed":'$ST'}}'
        case "$ARGS" in *" --strict "*) exit 1 ;; esac
        exit 0 ;;
    esac
    echo "Skills version  v6.50.0 -> v6.56.0 available (run pharn update)"
    echo "Differs from pharn-dev/pharn-oss@main (PHARN-owned):"
    echo "  pharn/CONSTITUTION.md"
    [ "${2:-}" = "--strict" ] && exit 1
    exit 0 ;;
  update)
    case "$ARGS" in
      *" --dry-run "*)
        case "$ARGS" in
          *" --force "*) F=true; B='["pharn/CONSTITUTION.md"]'; W='["pharn/CONSTITUTION.md","pharn/pharn-core/README.md"]'; S='[]'; L=forced; CT='"forced":1,"skipped":0' ;;
          *) F=false; B='[]'; W='["pharn/pharn-core/README.md"]'; S='[{"label":"modified","rels":["pharn/CONSTITUTION.md"]}]'; L=modified; CT='"forced":0,"skipped":1' ;;
        esac
        echo '{"schemaVersion":1,"command":"update","dryRun":true,"status":"planned","force":'$F',"channel":"main","channelChange":null,"source":{"kind":"main","tag":null},"version":{"installed":"6.50.0","latest":"6.56.0","recorded":"6.50.0","withheld":true,"pending":"6.56.0"},"archetypes":["lib"],"plan":{"layout":"pharn","abandonedLayout":null,"featuresReadmeRelocation":false,"capabilities":{"count":1,"changes":[]},"files":[{"rel":"pharn/pharn-core/README.md","action":"write","label":"updated","backup":false,"forced":false},{"rel":"pharn/CONSTITUTION.md","action":"'"$([ $F = true ] && echo write || echo skip)"'","label":"'$L'","backup":'$F',"forced":'$F'}],"writes":'"$W"',"backups":'"$B"',"skipped":'"$S"',"counts":{"updated":1,"restored":0,"ok":85,'"$CT"'},"models":{"outcome":"ok","label":null,"replacedLegacyDefault":false,"backup":false,"conversion":null,"problems":[],"upstreamReasons":[]},"hooks":{"status":"missing","missing":[{"event":"Stop","matcher":"","command":"node .claude/hooks/require-loop-record.cjs","args":null}],"localOnly":[],"file":".claude/settings.json","reason":null},"frozenCapabilities":[],"unknownCapabilities":[],"recordsNote":null}}'
        exit 0 ;;
    esac
    case "$ARGS" in *" --json "*) echo "Incomplete option for update: --json needs --dry-run" >&2; exit 1 ;; esac
    case "$ARGS" in *" --yes "*) ;; *) echo "pharn update needs to confirm before it writes. Pass --yes." >&2; exit 1 ;; esac
    echo "Updated 1 file. SKIPPED (modified): pharn/CONSTITUTION.md"
    echo "HOOKS: Stop: {\"type\":\"command\",\"command\":\"node .claude/hooks/require-loop-record.cjs\"}"
    exit 0 ;;
  init) echo "pharn init needs an interactive terminal" >&2; exit 1 ;;
  *) echo "unsupported" >&2; exit 1 ;;
esac
STUB
chmod +x bin/pharn
