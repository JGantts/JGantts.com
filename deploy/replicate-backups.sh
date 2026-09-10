#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "usage: $0 --data-root ABS --release-root ABS [--max-lag-hours N] [--min-free-kib N]" >&2
  exit 64
}

data_root=
release_root=
max_lag_hours=26
min_free_kib=1048576
while (($#)); do
  case "$1" in
    --data-root) data_root=${2-}; shift 2 ;;
    --release-root) release_root=${2-}; shift 2 ;;
    --max-lag-hours) max_lag_hours=${2-}; shift 2 ;;
    --min-free-kib) min_free_kib=${2-}; shift 2 ;;
    *) usage ;;
  esac
done

for value in "$data_root" "$release_root"; do
  [[ -n "$value" && "$value" == /* && "$value" != / && "$value" != */../* ]] || usage
done
[[ "$max_lag_hours" =~ ^[1-9][0-9]*$ && "$min_free_kib" =~ ^[1-9][0-9]*$ ]] || usage
command -v restic >/dev/null || { echo "restic is required" >&2; exit 69; }
[[ -n "${RESTIC_REPOSITORY-}" && -n "${RESTIC_PASSWORD-}" ]] \
  || { echo "restic repository credentials are not configured" >&2; exit 78; }

data_root=$(realpath "$data_root")
release_root=$(realpath "$release_root")
backup_root="$data_root/backups/pre-deploy"
latest_link="$backup_root/latest"
[[ -L "$latest_link" ]] || { echo "verified latest backup link is missing" >&2; exit 66; }
latest=$(realpath "$latest_link")
[[ "$latest" == "$backup_root"/* && -f "$latest/content.sqlite" ]] \
  || { echo "latest backup resolves outside the verified backup root" >&2; exit 65; }
test -d "$latest/media/originals"
test -d "$latest/media/derived"

if stat -c %Y "$latest" >/dev/null 2>&1; then modified_at=$(stat -c %Y "$latest"); else modified_at=$(stat -f %m "$latest"); fi
age_seconds=$(( $(date +%s) - modified_at ))
(( age_seconds <= max_lag_hours * 3600 )) \
  || { echo "latest verified backup exceeds replication lag threshold" >&2; exit 75; }
available_kib=$(df -Pk "$data_root" | awk 'NR == 2 { print $4 }')
(( available_kib >= min_free_kib )) \
  || { echo "backup volume free capacity is below threshold" >&2; exit 75; }

current=$(realpath "$release_root/current")
[[ "$current" == "$release_root/releases/"* && -d "$current" ]] \
  || { echo "current release is invalid" >&2; exit 65; }
(
  cd "$current/jgantts-server"
  # shellcheck disable=SC2016
  node -e 'const Database=require("better-sqlite3"); const db=new Database(process.argv[1],{readonly:true,fileMustExist:true}); const result=db.pragma("integrity_check",{simple:true}); db.close(); if(result!=="ok") throw new Error(`integrity check failed: ${result}`);' "$latest/content.sqlite"
)

restic backup "$latest" --tag jgantts-content --tag verified
restic check
restic forget --tag jgantts-content --keep-daily 7 --keep-weekly 5 --keep-monthly 12 --prune
echo "Replicated verified backup off-host: $latest"
