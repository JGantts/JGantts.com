#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "usage: $0 --data-root ABS --release-root ABS" >&2
  exit 64
}

data_root=
release_root=
while (($#)); do
  case "$1" in
    --data-root) data_root=${2-}; shift 2 ;;
    --release-root) release_root=${2-}; shift 2 ;;
    *) usage ;;
  esac
done
for value in "$data_root" "$release_root"; do
  [[ -n "$value" && "$value" == /* && "$value" != / && "$value" != */../* ]] || usage
done
command -v restic >/dev/null || { echo "restic is required" >&2; exit 69; }
[[ -n "${RESTIC_REPOSITORY-}" && -n "${RESTIC_PASSWORD-}" ]] || { echo "restic is not configured" >&2; exit 78; }

data_root=$(realpath "$data_root")
release_root=$(realpath "$release_root")
current=$(realpath "$release_root/current")
[[ "$current" == "$release_root/releases/"* && -d "$current" ]] || { echo "current release is invalid" >&2; exit 65; }
rehearsal_root="$data_root/rehearsals"
reports="$rehearsal_root/reports"
run_id=$(date -u +%Y%m%dT%H%M%SZ)
restore_root="$rehearsal_root/$run_id"
mkdir -p "$reports"
[[ ! -e "$restore_root" ]] || { echo "rehearsal destination already exists" >&2; exit 65; }
trap 'rm -rf -- "$restore_root"' EXIT

restic restore latest --tag jgantts-content --target "$restore_root"
database=$(find "$restore_root" -path '*/content.sqlite' -type f -print -quit)
media=$(find "$restore_root" -path '*/media' -type d -print -quit)
[[ -n "$database" && -n "$media" && -d "$media/originals" && -d "$media/derived" ]] \
  || { echo "restored backup is incomplete" >&2; exit 65; }
(
  cd "$current/jgantts-server"
  node -e 'const Database=require("better-sqlite3"); const db=new Database(process.argv[1],{readonly:true,fileMustExist:true}); const integrity=db.pragma("integrity_check",{simple:true}); const tables=db.prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='"'"'table'"'"'").pluck().get(); db.close(); if(integrity!=="ok"||!tables) throw new Error("restored database verification failed"); process.stdout.write(String(tables));' "$database" > "$restore_root/table-count"
)
representative_media=$(find "$media" -type f -print -quit)
if [[ -n "$representative_media" ]]; then test -s "$representative_media"; fi
node - "$reports/$run_id.json" "$database" "${representative_media-}" "$(<"$restore_root/table-count")" <<'NODE'
const fs = require('node:fs');
const [file, database, representativeMedia, tableCount] = process.argv.slice(2);
fs.writeFileSync(file, `${JSON.stringify({
  schemaVersion: 1, verifiedAt: new Date().toISOString(), database,
  databaseIntegrity: 'ok', tableCount: Number(tableCount),
  representativeMedia: representativeMedia || null,
}, null, 2)}\n`);
NODE
rm -rf -- "$restore_root"
trap - EXIT
echo "Off-host restore rehearsal passed; report: $reports/$run_id.json"
