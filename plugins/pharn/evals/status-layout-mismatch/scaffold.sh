#!/usr/bin/env bash
# Builds a fake PHARN project in the empty eval workspace. The stub CLI replays
# canned output in the shape pharn-cli main has for the unreleased 0.20.0
# (pharn-cli PRs #377 and #390; the stub calls itself 0.20.0), needs no
# network, and logs each call.
# The install is current (7.3.0) but recorded at the flat layout while upstream
# ships the pharn layout. So `status --json` reports `drift: null` with `layout`
# set, `--strict` fails on the mismatch alone, and, because 0.20.0 plans every
# update, a plain `update --dry-run` is `planned` with the move to the pharn
# layout: no `--force` is needed to move it.
set -eu
mkdir -p bin
git init -q . 2>/dev/null || true
cat > pharn.config.json <<'JSON'
{ "skillsVersion": "7.3.0", "layout": "flat", "ref": "latest", "archetypes": ["lib"], "capabilities": [{ "name": "a11y", "role": "griller", "source": "auto" }] }
JSON
cat > bin/pharn <<'STUB'
#!/usr/bin/env bash
echo "pharn $*" >> "$(dirname "$0")/../.pharn-calls.log"
ARGS=" $* "
case "$1" in
  --version) echo "0.20.0" ;;
  list)
    echo '{"mode":"archetype","skillsVersion":"7.3.0","archetypes":["lib"],"capabilities":[{"name":"a11y","role":"griller","source":"auto"}]}' ;;
  status)
    case "$ARGS" in *" --no-drift "*) ND=true ;; *) ND=false ;; esac
    case "$ARGS" in
      *" --json "*)
        ST=false; case "$ARGS" in *" --strict "*) ST=true ;; esac
        if [ $ND = true ]; then
          echo '{"schemaVersion":1,"node":{"floor":"24.2.0","running":"24.13.1","status":"ok"},"version":{"installed":"7.3.0","latest":"7.3.0","channel":"latest","source":{"kind":"release","tag":"v7.3.0"},"ahead":false,"outdated":false},"archetypes":["lib"],"capabilities":{"count":1},"layout":{"recorded":"flat","upstream":null},"drift":null,"orphans":null,"hooks":null,"models":null,"unknownCapabilities":null,"prettierignore":null,"strict":{"enabled":'$ST',"failed":false}}'
          exit 0
        fi
        echo '{"schemaVersion":1,"node":{"floor":"24.2.0","running":"24.13.1","status":"ok"},"version":{"installed":"7.3.0","latest":"7.3.0","channel":"latest","source":{"kind":"release","tag":"v7.3.0"},"ahead":false,"outdated":false},"archetypes":["lib"],"capabilities":{"count":1},"layout":{"recorded":"flat","upstream":"pharn"},"drift":null,"orphans":null,"hooks":{"status":"match","missing":[],"localOnly":[],"file":".claude/settings.json","reason":null},"models":null,"unknownCapabilities":[],"prettierignore":null,"strict":{"enabled":'$ST',"failed":'$ST'}}'
        [ $ST = true ] && exit 1
        exit 0 ;;
    esac
    echo "Skills version  v7.3.0 (up to date with release v7.3.0)"
    if [ $ND = false ]; then
      echo "LAYOUT"
      echo "  Recorded at the flat layout; pharn-oss now ships the pharn layout."
      echo "  Drift is not checked across layouts; it is checked after the move."
      echo "  Run pharn update to move the install."
      echo "  pharn status --strict fails until the install is moved."
      case "$ARGS" in *" --strict "*) exit 1 ;; esac
    fi
    exit 0 ;;
  update)
    # 0.20.0: --json implies --dry-run, and --compact implies --json.
    case "$ARGS" in
      *" --dry-run "*|*" --json "*|*" --compact "*)
        case "$ARGS" in
          *" --json "*|*" --compact "*)
            case "$ARGS" in *" --force "*) echo "This stub replays only the plain dry run." >&2; exit 1 ;; esac
            echo '{"schemaVersion":1,"command":"update","dryRun":true,"status":"planned","force":false,"channel":"latest","channelChange":null,"source":{"kind":"release","tag":"v7.3.0"},"version":{"installed":"7.3.0","latest":"7.3.0","recorded":"7.3.0","withheld":false,"pending":null},"archetypes":["lib"],"compact":true,"plan":{"layout":"pharn","abandonedLayout":"flat","featuresReadmeRelocation":false,"capabilities":{"count":1,"changes":[]},"files":[{"rel":"pharn/CONSTITUTION.md","action":"write","label":"restored","backup":false,"forced":false},{"rel":"pharn/contracts/spec.md","action":"write","label":"restored","backup":false,"forced":false}],"filesOmitted":{"action":"noop","count":0},"writes":["pharn/CONSTITUTION.md","pharn/contracts/spec.md"],"backups":[],"skipped":[],"counts":{"updated":0,"restored":2,"ok":0,"forced":0,"skipped":0},"models":{"outcome":"ok","label":null,"replacedLegacyDefault":false,"backup":false,"conversion":null,"problems":[],"upstreamReasons":[]},"hooks":{"status":"match","missing":[],"localOnly":[],"file":null,"reason":null},"rootMigration":null,"frozenCapabilities":[],"unknownCapabilities":[],"recordsNote":null}}' ;;
          *) echo "Your install would move to the pharn/ layout. The old top-level copies would be left behind and no longer managed by pharn — you would delete them by hand."
             echo "Would write 2 files (restored 2)." ;;
        esac
        exit 0 ;;
    esac
    case "$ARGS" in *" --yes "*) ;; *) echo "pharn update needs to confirm before it writes. Pass --yes." >&2; exit 1 ;; esac
    case "$ARGS" in *" --force "*) touch "$(dirname "$0")/../.pharn-forced" ;; esac
    echo "Your install moved to the pharn/ layout. The old top-level copies are left behind and are no longer managed by pharn — delete them by hand."
    exit 0 ;;
  add|remove) echo "This stub does not add or remove capabilities." >&2; exit 1 ;;
  init) echo "pharn init needs an interactive terminal" >&2; exit 1 ;;
  *) echo "unsupported" >&2; exit 1 ;;
esac
STUB
chmod +x bin/pharn
