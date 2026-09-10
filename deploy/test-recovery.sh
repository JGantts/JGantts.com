#!/usr/bin/env bash

set -euo pipefail

repository_root=$(cd "$(dirname "$0")/.." && pwd)
test_root=$(mktemp -d)
trap 'rm -rf -- "$test_root"' EXIT
mkdir -p "$test_root/bin" "$test_root/app/releases/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/jgantts-server" \
  "$test_root/data/backups/pre-deploy/backup/media/originals" \
  "$test_root/data/backups/pre-deploy/backup/media/derived"
touch "$test_root/data/backups/pre-deploy/backup/content.sqlite"
printf 'media\n' > "$test_root/data/backups/pre-deploy/backup/media/originals/example.jpg"
ln -s "$test_root/data/backups/pre-deploy/backup" "$test_root/data/backups/pre-deploy/latest"
ln -s "$test_root/app/releases/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "$test_root/app/current"
printf '{"release":{"commitId":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}\n' \
  > "$test_root/app/releases/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/release-manifest.json"
real_node=$(command -v node)

cat > "$test_root/bin/node" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1-}" == -e && "${2-}" == *restored\ database\ verification* ]]; then printf '1'; exit 0; fi
if [[ "${1-}" == -e && "${2-}" == *better-sqlite3* ]]; then exit 0; fi
exec "$REAL_NODE" "$@"
SH
cat > "$test_root/bin/restic" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
case "${1-}" in
  backup|check|forget) exit 0 ;;
  restore)
    while (($#)); do
      if [[ "$1" == --target ]]; then target=$2; break; fi
      shift
    done
    mkdir -p "$target/snapshot/media/originals" "$target/snapshot/media/derived"
    touch "$target/snapshot/content.sqlite"
    printf 'media\n' > "$target/snapshot/media/originals/example.jpg"
    ;;
  *) exit 1 ;;
esac
SH
cat > "$test_root/bin/curl" <<'SH'
#!/usr/bin/env bash
printf '{"commitId":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}\n'
SH
chmod +x "$test_root/bin/node" "$test_root/bin/restic" "$test_root/bin/curl"

PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" RESTIC_REPOSITORY=test RESTIC_PASSWORD=test \
  "$repository_root/deploy/replicate-backups.sh" \
  --data-root "$test_root/data" --release-root "$test_root/app" --min-free-kib 1
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" RESTIC_REPOSITORY=test RESTIC_PASSWORD=test \
  "$repository_root/deploy/restore-rehearsal.sh" \
  --data-root "$test_root/data" --release-root "$test_root/app"
report=$(find "$test_root/data/rehearsals/reports" -type f -name '*.json' -print -quit)
grep -q '"databaseIntegrity": "ok"' "$report"

printf 'unit\n' > "$test_root/installed.service"
cp "$test_root/installed.service" "$test_root/expected.service"
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" \
  "$repository_root/deploy/check-release-drift.sh" "$test_root/app" https://example.com \
  "$test_root/installed.service" "$test_root/expected.service"

previous_sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
mkdir -p "$test_root/app/releases/$previous_sha"
ln -s "$test_root/app/releases/$previous_sha" "$test_root/app/previous"
for sha in cccccccccccccccccccccccccccccccccccccccc dddddddddddddddddddddddddddddddddddddddd eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee; do
  mkdir -p "$test_root/app/releases/$sha"
done
"$repository_root/deploy/prune-releases.sh" "$test_root/app" 1
[[ "$(find "$test_root/app/releases" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" == 3 ]]

echo 'Recovery, drift, and safe release-retention tests passed.'
