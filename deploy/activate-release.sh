#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "usage: $0 --release-root ABS --release-sha SHA --service NAME --data-root ABS --schema-root ABS --origin URL --smoke-script ABS --summary ABS" >&2
  exit 64
}

release_root=
release_sha=
service_name=
data_root=
schema_root=
origin=
smoke_script=
summary_path=

while (($#)); do
  case "$1" in
    --release-root) release_root=${2-}; shift 2 ;;
    --release-sha) release_sha=${2-}; shift 2 ;;
    --service) service_name=${2-}; shift 2 ;;
    --data-root) data_root=${2-}; shift 2 ;;
    --schema-root) schema_root=${2-}; shift 2 ;;
    --origin) origin=${2-}; shift 2 ;;
    --smoke-script) smoke_script=${2-}; shift 2 ;;
    --summary) summary_path=${2-}; shift 2 ;;
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
validate_absolute_path schema-root "$schema_root"
validate_absolute_path smoke-script "$smoke_script"
validate_absolute_path summary "$summary_path"
[[ "$release_sha" =~ ^[0-9a-fA-F]{40}$ ]] || { echo "invalid release SHA" >&2; exit 64; }
[[ "$service_name" =~ ^[A-Za-z0-9_.@-]+$ ]] || { echo "invalid service name" >&2; exit 64; }
[[ "$origin" =~ ^https://[^/]+/?$ ]] || { echo "origin must be a clean HTTPS origin" >&2; exit 64; }
[[ -f "$smoke_script" && ! -L "$smoke_script" ]] || { echo "smoke script is unavailable" >&2; exit 66; }

release_root=$(realpath "$release_root")
data_root=$(realpath "$data_root")
schema_root=$(realpath "$schema_root")
releases="$release_root/releases"
target="$releases/$release_sha"
current_link="$release_root/current"
previous_link="$release_root/previous"
[[ -d "$target" && ! -L "$target" && -f "$target/release-manifest.json" ]] \
  || { echo "validated release is not installed: $release_sha" >&2; exit 66; }
[[ "$data_root" != "$release_root"/* && "$release_root" != "$data_root"/* ]] \
  || { echo "persistent data and releases must not contain one another" >&2; exit 64; }
[[ "$schema_root" == "$data_root"/backups/* && -f "$schema_root/content.sqlite" ]] \
  || { echo "schema root must be a verified backup beneath the persistent data root" >&2; exit 64; }

atomic_link() {
  local destination=$1 link_path=$2 temporary_link
  temporary_link="${link_path}.new.$$"
  ln -s "$destination" "$temporary_link"
  node - "$temporary_link" "$link_path" <<'NODE'
const fs = require('node:fs');
const [source, destination] = process.argv.slice(2);
fs.renameSync(source, destination);
NODE
}

resolved_release_link() {
  local link_path=$1 resolved release_name
  [[ -L "$link_path" ]] || return 1
  resolved=$(realpath "$link_path")
  [[ "$(dirname "$resolved")" == "$releases" && -d "$resolved" && ! -L "$resolved" ]] || return 1
  release_name=$(basename "$resolved")
  [[ "$release_name" =~ ^[0-9a-fA-F]{40}$ ]] || return 1
  printf '%s\n' "$resolved"
}

release_commit() {
  node -e 'const m=require(process.argv[1]); if(!/^[0-9a-f]{40}$/i.test(m.release?.commitId||"")) process.exit(1); process.stdout.write(m.release.commitId)' "$1/release-manifest.json"
}

wait_active() {
  local remaining=30
  while ((remaining-- > 0)); do
    if sudo systemctl is-active --quiet "$service_name"; then return 0; fi
    sleep 1
  done
  return 1
}

wait_inactive() {
  local remaining=30
  while ((remaining-- > 0)); do
    if ! sudo systemctl is-active --quiet "$service_name"; then return 0; fi
    sleep 1
  done
  return 1
}

schema_check() {
  local release=$1 root=$2
  env NODE_ENV=production node "$release/jgantts-server/dist/cli/check-schema-compatibility.js" "$root"
}

write_summary() {
  local result=$1 active=$2 preceding=$3 rollback=$4 completed_at
  completed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  node - "$summary_path" "$result" "$active" "$preceding" "$rollback" "$activated_at" "$completed_at" <<'NODE'
const fs = require('node:fs');
const [file, result, activeRelease, precedingRelease, rollbackResult, activatedAt, completedAt] = process.argv.slice(2);
fs.writeFileSync(file, `${JSON.stringify({
  schemaVersion: 1, result, activeRelease, precedingRelease: precedingRelease || null,
  rollbackResult: rollbackResult || null, activatedAt, completedAt,
}, null, 2)}\n`, { mode: 0o640 });
NODE
}

schema_check "$target" "$schema_root" >/dev/null
old_release=
if [[ -e "$current_link" || -L "$current_link" ]]; then
  old_release=$(resolved_release_link "$current_link") \
    || { echo "current is not a valid release symlink" >&2; exit 65; }
fi
if [[ "$old_release" == "$target" ]]; then
  echo "Release is already active: $release_sha"
  exit 0
fi

activated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
activation_started_epoch=$(date +%s)
if [[ -n "$old_release" ]]; then atomic_link "$old_release" "$previous_link"; fi
atomic_link "$target" "$current_link"

activation_ok=false
if sudo systemctl restart "$service_name" && wait_active \
  && EXPECTED_COMMIT_SHA="$release_sha" REQUIRE_CONTENT_API=1 node "$smoke_script" "$origin"; then
  activation_ok=true
fi

if [[ "$activation_ok" == true ]]; then
  write_summary success "$target" "$old_release" not-needed
  duration_seconds=$(( $(date +%s) - activation_started_epoch ))
  printf '{"event":"release_activation_completed","release":"%s","durationSeconds":%d,"rollback":false}\n' "$release_sha" "$duration_seconds"
  echo "Activated release: $target"
  exit 0
fi

sudo journalctl --unit "$service_name" --since "$activated_at" --no-pager --lines 200 >&2 || true
if [[ -z "$old_release" ]]; then
  write_summary failed-no-rollback "$target" "" unavailable
  echo "Activation failed and no preceding release is recorded; manual recovery required" >&2
  exit 70
fi

sudo systemctl stop "$service_name"
wait_inactive || { echo "service did not stop before rollback validation" >&2; exit 69; }
schema_snapshot=$(mktemp -d "$data_root/backups/.schema-check-${release_sha}.XXXXXX")
cleanup_schema_snapshot() { rm -rf -- "$schema_snapshot"; }
trap cleanup_schema_snapshot EXIT
env NODE_ENV=production JGANTTS_DATA_ROOT="$data_root" \
  node "$target/jgantts-server/dist/cli/backup-content.js" \
    --quiesced-database "$schema_snapshot/content.sqlite"
if ! schema_check "$old_release" "$schema_snapshot" >/dev/null; then
  write_summary failed-incompatible-rollback "$target" "$old_release" refused
  echo "Activation failed and the preceding release is schema-incompatible; manual recovery required" >&2
  exit 71
fi
cleanup_schema_snapshot
trap - EXIT

old_sha=$(release_commit "$old_release")
atomic_link "$old_release" "$current_link"
if sudo systemctl restart "$service_name" && wait_active \
  && EXPECTED_COMMIT_SHA="$old_sha" REQUIRE_CONTENT_API=1 node "$smoke_script" "$origin"; then
  write_summary rolled-back "$old_release" "$target" success
  duration_seconds=$(( $(date +%s) - activation_started_epoch ))
  printf '{"event":"release_activation_failed","release":"%s","durationSeconds":%d,"rollback":true,"rollbackResult":"success"}\n' "$release_sha" "$duration_seconds"
  echo "Activation failed; restored preceding release: $old_release" >&2
  exit 72
fi

sudo journalctl --unit "$service_name" --since "$activated_at" --no-pager --lines 200 >&2 || true
write_summary failed-rollback "$old_release" "$target" failed
echo "Activation and automatic rollback both failed; manual recovery required" >&2
exit 73
