#!/usr/bin/env bash

set -euo pipefail
started_at=$(date +%s)

usage() {
  echo "usage: $0 --release-root ABS --release-sha SHA --service NAME --data-root ABS --backup-root ABS" >&2
  exit 64
}

release_root=
release_sha=
service_name=
data_root=
backup_root=

while (($#)); do
  case "$1" in
    --release-root) release_root=${2-}; shift 2 ;;
    --release-sha) release_sha=${2-}; shift 2 ;;
    --service) service_name=${2-}; shift 2 ;;
    --data-root) data_root=${2-}; shift 2 ;;
    --backup-root) backup_root=${2-}; shift 2 ;;
    *) usage ;;
  esac
done

validate_absolute_path() {
  local label=$1 value=$2
  [[ -n "$value" && "$value" == /* && "$value" != / && "$value" != *$'\n'* ]] \
    || { echo "$label must be a non-root absolute path" >&2; exit 64; }
  [[ "$value" != */../* && "$value" != */.. && "$value" != *'/./'* ]] \
    || { echo "$label contains unsafe traversal" >&2; exit 64; }
}

validate_absolute_path release-root "$release_root"
validate_absolute_path data-root "$data_root"
validate_absolute_path backup-root "$backup_root"
[[ "$release_sha" =~ ^[0-9a-fA-F]{40}$ ]] || { echo "invalid release SHA" >&2; exit 64; }
[[ "$service_name" =~ ^[A-Za-z0-9_.@-]+$ ]] || { echo "invalid service name" >&2; exit 64; }

release_root=$(realpath "$release_root")
data_root=$(realpath "$data_root")
mkdir -p "$backup_root"
backup_root=$(realpath "$backup_root")
release="$release_root/releases/$release_sha"
[[ -d "$release" && -f "$release/jgantts-server/dist/cli/backup-content.js" ]] \
  || { echo "inactive release backup tool is unavailable" >&2; exit 66; }
[[ "$backup_root" == "$data_root"/backups/* || "$backup_root" == "$data_root"/backups ]] \
  || { echo "backup root must be beneath the persistent data backup directory" >&2; exit 64; }

wait_state() {
  local expected=$1 remaining=30
  while ((remaining-- > 0)); do
    if [[ "$expected" == active ]] && sudo systemctl is-active --quiet "$service_name"; then return 0; fi
    if [[ "$expected" == inactive ]] && ! sudo systemctl is-active --quiet "$service_name"; then return 0; fi
    sleep 1
  done
  return 1
}

service_stopped=false
restart_current() {
  if [[ "$service_stopped" == true ]]; then
    sudo systemctl restart "$service_name" || true
    wait_state active || true
  fi
}
trap restart_current EXIT

sudo systemctl stop "$service_name"
service_stopped=true
wait_state inactive || { echo "service did not quiesce within 30 seconds" >&2; exit 69; }

chmod 0750 "$backup_root"
backup_name="$(date -u +%Y%m%dT%H%M%SZ)-$release_sha"
backup_path="$backup_root/$backup_name"
(
  cd "$release/jgantts-server"
  env NODE_ENV=production JGANTTS_DATA_ROOT="$data_root" \
    node dist/cli/backup-content.js "$backup_path"
  # shellcheck disable=SC2016
  node -e 'const Database = require("better-sqlite3"); const database = new Database(process.argv[1], { readonly: true, fileMustExist: true }); const result = database.pragma("integrity_check", { simple: true }); database.close(); if (result !== "ok") throw new Error(`SQLite integrity check failed: ${result}`);' "$backup_path/content.sqlite"
)
test -d "$backup_path/media/originals"
test -d "$backup_path/media/derived"
representative_media=$(find "$backup_path/media" -type f -print -quit)
if [[ -n "$representative_media" ]]; then test -r "$representative_media"; fi

temporary_latest="$backup_root/.latest.new.$$"
ln -s "$backup_path" "$temporary_latest"
node - "$temporary_latest" "$backup_root/latest" <<'NODE'
const fs = require('node:fs');
fs.renameSync(process.argv[2], process.argv[3]);
NODE

sudo systemctl restart "$service_name"
wait_state active || { echo "service did not recover after backup quiesce" >&2; exit 69; }
service_stopped=false
trap - EXIT
duration_seconds=$(( $(date +%s) - started_at ))
printf '{"event":"content_backup_completed","release":"%s","durationSeconds":%d}\n' "$release_sha" "$duration_seconds"
echo "Verified quiesced pre-deploy backup: $backup_path"
