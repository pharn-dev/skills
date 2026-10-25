#!/usr/bin/env bash
# Builds a fake PHARN project in the empty eval workspace. The stub CLI replays
# canned 0.14.0-shaped output, needs no network, and logs each call.
# The install (6.75.0, upstream 7.0.0) still has the old root footprint: an
# unedited THREAT-MODEL.md, an edited LIMITS.md, memory-bank/ next to an
# existing pharn/memory-bank/ (a conflict), scratch in .pharn/ beside pharn-ci's
# ci.yml, and a .gitignore naming the old paths. The dry run reports all of it
# under plan.rootMigration.
set -eu
mkdir -p bin pharn/memory-bank memory-bank .pharn
git init -q . 2>/dev/null || true
cat > pharn.config.json <<'JSON'
{ "skillsVersion": "6.75.0", "layout": "pharn", "archetypes": ["lib"], "capabilities": [] }
JSON
printf '# Threat model\n\nAs pharn wrote it.\n' > THREAT-MODEL.md
printf '# Limits\n\nOur own notes on the limits.\n' > LIMITS.md
printf '# Project brief\n\nThe canon at the old location.\n' > memory-bank/projectbrief.md
printf '# Project brief\n\nA second canon someone started under pharn/.\n' > pharn/memory-bank/projectbrief.md
printf 'threshold: 80\n' > .pharn/ci.yml
printf '{}\n' > .pharn/loop-state.json
printf 'node_modules/\n.pharn/\n.pharn-backup/\n.pharn.lock\n' > .gitignore
cat > bin/pharn <<'STUB'
#!/usr/bin/env bash
echo "pharn $*" >> "$(dirname "$0")/../.pharn-calls.log"
ARGS=" $* "
RM='{"docs":[{"rel":"THREAT-MODEL.md","action":"delete"},{"rel":"LIMITS.md","action":"keep-edited"}],"moves":[{"from":"memory-bank/","to":"pharn/memory-bank/","action":"conflict"},{"from":"pharn.spec-template.md","to":"pharn/spec-template.md","action":"absent"}],"scratchNotice":true,"gitignoreHints":["pharn/.run/","pharn/.backup/","pharn/.lock*"]}'
case "$1" in
  --version) echo "0.14.0" ;;
  list)
    echo '{"mode":"archetype","skillsVersion":"6.75.0","archetypes":["lib"],"capabilities":[{"name":"a11y","role":"griller","source":"auto"}]}' ;;
  status)
    case "$ARGS" in
      *" --json "*)
        echo '{"schemaVersion":1,"node":{"floor":"24.2.0","running":"24.13.1","status":"ok"},"version":{"installed":"6.75.0","latest":"7.0.0","channel":"main","source":{"kind":"main","tag":null},"ahead":false,"outdated":true},"archetypes":["lib"],"capabilities":{"count":1},"drift":{"modified":[],"missing":[],"unreadable":[],"okCount":87},"hooks":{"status":"match","missing":[],"localOnly":[],"file":".claude/settings.json","reason":null},"models":null,"unknownCapabilities":[],"strict":{"enabled":false,"failed":false}}'
        exit 0 ;;
    esac
    echo "Skills version  v6.75.0 -> v7.0.0 available (run pharn update)"
    exit 0 ;;
  update)
    case "$ARGS" in
      *" --dry-run "*)
        case "$ARGS" in *" --json "*) ;; *)
          echo "ROOT MIGRATION"
          echo "  WOULD DELETE THREAT-MODEL.md — pharn now keeps it at pharn/THREAT-MODEL.md, and this copy is still exactly as pharn wrote it."
          echo "  kept LIMITS.md — you edited it. pharn now ships pharn/LIMITS.md; this copy is no longer managed (listed under ORPHANED)."
          echo "  NOT MOVED memory-bank/ — pharn/memory-bank/ already exists. pharn never merges them: merge them by hand, then delete memory-bank/."
          echo "  .pharn/ — runtime scratch now lives in pharn/.run/. The old .pharn/ contents other than ci.yml can be deleted."
          echo "  .gitignore names pharn's old paths. Replace them with: pharn/.run/, pharn/.backup/, pharn/.lock* (pharn never edits .gitignore)."
          exit 0 ;;
        esac
        echo '{"schemaVersion":1,"command":"update","dryRun":true,"compact":true,"status":"planned","force":false,"channel":"main","channelChange":null,"source":{"kind":"main","tag":null},"version":{"installed":"6.75.0","latest":"7.0.0","recorded":"7.0.0","withheld":false,"pending":null},"archetypes":["lib"],"plan":{"layout":"pharn","abandonedLayout":null,"featuresReadmeRelocation":false,"rootMigration":'"$RM"',"capabilities":{"count":1,"changes":[]},"files":[{"rel":"pharn/THREAT-MODEL.md","action":"write","label":"restored","backup":false,"forced":false},{"rel":"pharn/LIMITS.md","action":"write","label":"restored","backup":false,"forced":false},{"rel":"pharn/pharn-core/README.md","action":"write","label":"updated","backup":false,"forced":false}],"filesOmitted":{"count":84},"writes":["pharn/THREAT-MODEL.md","pharn/LIMITS.md","pharn/pharn-core/README.md"],"backups":[],"skipped":[],"counts":{"updated":1,"restored":2,"ok":84,"forced":0,"skipped":0},"models":{"outcome":"ok","label":null,"replacedLegacyDefault":false,"backup":false,"conversion":null,"problems":[],"upstreamReasons":[]},"hooks":{"status":"match","missing":[],"localOnly":[],"file":".claude/settings.json","reason":null},"frozenCapabilities":[],"unknownCapabilities":[],"recordsNote":null,"orphans":[{"path":"LIMITS.md","state":"edited"}]}}'
        exit 0 ;;
    esac
    case "$ARGS" in *" --json "*) echo "Incomplete option for update: --json needs --dry-run" >&2; exit 1 ;; esac
    case "$ARGS" in *" --yes "*) ;; *) echo "pharn update needs to confirm before it writes. Pass --yes." >&2; exit 1 ;; esac
    echo "ROOT MIGRATION"
    echo "  WOULD DELETE THREAT-MODEL.md — pharn now keeps it at pharn/THREAT-MODEL.md, and this copy is still exactly as pharn wrote it."
    echo "  kept LIMITS.md — you edited it. pharn now ships pharn/LIMITS.md; this copy is no longer managed (listed under ORPHANED)."
    echo "  NOT MOVED memory-bank/ — pharn/memory-bank/ already exists. pharn never merges them: merge them by hand, then delete memory-bank/."
    rm -f "$(dirname "$0")/../THREAT-MODEL.md"
    echo "Updated 3 files."
    echo "ROOT MIGRATION"
    echo "  deleted THREAT-MODEL.md — pharn now keeps it at pharn/THREAT-MODEL.md."
    echo "  kept LIMITS.md — you edited it. pharn now ships pharn/LIMITS.md; this copy is no longer managed (listed under ORPHANED)."
    echo "  NOT MOVED memory-bank/ — pharn/memory-bank/ already exists. pharn never merges them: merge them by hand, then delete memory-bank/."
    echo "  .pharn/ — runtime scratch now lives in pharn/.run/. The old .pharn/ contents other than ci.yml can be deleted."
    echo "  .gitignore names pharn's old paths. Replace them with: pharn/.run/, pharn/.backup/, pharn/.lock* (pharn never edits .gitignore)."
    exit 1 ;;
  add|remove)
    echo "not used in this case" >&2; exit 1 ;;
  init) echo "pharn init needs an interactive terminal" >&2; exit 1 ;;
  *) echo "unsupported" >&2; exit 1 ;;
esac
STUB
chmod +x bin/pharn
