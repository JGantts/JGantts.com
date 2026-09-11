#!/usr/bin/env bash

set -euo pipefail
started_at=$(date +%s)

usage() {
  echo "usage: $0 --release-root ABS --artifact ABS --expected-checksum HEX --expected-commit SHA --service NAME --service-user USER --data-root ABS --maps-mount ABS --legacy-maps ABS" >&2
  exit 64
}

release_root=
artifact=
expected_checksum=
expected_commit=
service_name=
service_user=
data_root=
maps_mount=
legacy_maps=

while (($#)); do
  case "$1" in
    --release-root) release_root=${2-}; shift 2 ;;
    --artifact) artifact=${2-}; shift 2 ;;
    --expected-checksum) expected_checksum=${2-}; shift 2 ;;
    --expected-commit) expected_commit=${2-}; shift 2 ;;
    --service) service_name=${2-}; shift 2 ;;
    --service-user) service_user=${2-}; shift 2 ;;
    --data-root) data_root=${2-}; shift 2 ;;
    --maps-mount) maps_mount=${2-}; shift 2 ;;
    --legacy-maps) legacy_maps=${2-}; shift 2 ;;
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
validate_absolute_path artifact "$artifact"
validate_absolute_path data-root "$data_root"
validate_absolute_path maps-mount "$maps_mount"
validate_absolute_path legacy-maps "$legacy_maps"
[[ "$expected_checksum" =~ ^[0-9a-fA-F]{64}$ ]] || { echo "invalid expected checksum" >&2; exit 64; }
[[ "$expected_commit" =~ ^[0-9a-fA-F]{40}$ ]] || { echo "invalid expected commit" >&2; exit 64; }
[[ "$service_name" =~ ^[A-Za-z0-9_.@-]+$ ]] || { echo "invalid service name" >&2; exit 64; }
[[ "$service_user" =~ ^[A-Za-z_][A-Za-z0-9_.-]*[$]?$ ]] || { echo "invalid service user" >&2; exit 64; }
id "$service_user" >/dev/null 2>&1 || { echo "service user does not exist" >&2; exit 67; }
deployment_user=$(id -un)
[[ "$service_user" != "$deployment_user" ]] || { echo "deployment and service users must be distinct" >&2; exit 65; }
[[ -f "$artifact" && ! -L "$artifact" ]] || { echo "artifact is not a regular file" >&2; exit 66; }

actual_checksum=$(sha256sum "$artifact" | awk '{print $1}')
normalized_expected_checksum=$(printf '%s' "$expected_checksum" | tr '[:upper:]' '[:lower:]')
[[ "$actual_checksum" == "$normalized_expected_checksum" ]] \
  || { echo "artifact checksum mismatch" >&2; exit 65; }

mkdir -p "$release_root/releases" "$(dirname "$maps_mount")"
release_root=$(realpath "$release_root")
data_root=$(realpath "$data_root")
[[ "$data_root" != "$release_root"/* && "$release_root" != "$data_root"/* ]] \
  || { echo "persistent data and releases must not contain one another" >&2; exit 64; }
releases_path=$(realpath "$release_root/releases")
[[ "$releases_path" == "$release_root/releases" ]] \
  || { echo "releases directory resolves outside the configured root" >&2; exit 65; }

archive_entries=$(tar -tzf "$artifact")
[[ -n "$archive_entries" ]] || { echo "release archive is empty" >&2; exit 65; }
while IFS= read -r entry; do
  [[ "$entry" != /* && "$entry" != ../* && "$entry" != */../* && "$entry" == "$expected_commit"/* ]] \
    || { echo "unsafe or unexpected archive path: $entry" >&2; exit 65; }
done <<< "$archive_entries"
if tar -tvzf "$artifact" | awk '$1 ~ /^[lh]/ { found=1 } END { exit !found }'; then
  echo "release archive contains a link" >&2
  exit 65
fi

target="$release_root/releases/$expected_commit"
if [[ -e "$target" || -L "$target" ]]; then
  [[ -d "$target" && ! -L "$target" && -f "$target/.artifact.sha256" ]] \
    || { echo "existing release is not a validated directory" >&2; exit 65; }
  installed_checksum=$(<"$target/.artifact.sha256")
  [[ "$installed_checksum" == "$actual_checksum" ]] \
    || { echo "existing release has a different artifact checksum" >&2; exit 65; }
  echo "Release already installed and checksum matches: $target"
  exit 0
fi

temporary_parent=$(mktemp -d "$release_root/releases/.install-${expected_commit}.XXXXXX")
cleanup() { rm -rf -- "$temporary_parent"; }
trap cleanup EXIT
tar --extract --gzip --file "$artifact" --directory "$temporary_parent" --no-same-owner --no-same-permissions
staged="$temporary_parent/$expected_commit"
[[ -d "$staged" && ! -L "$staged" ]] || { echo "archive did not contain the expected release root" >&2; exit 65; }

node - "$staged/release-manifest.json" "$expected_commit" <<'NODE'
const fs = require('node:fs');
const [manifestPath, expectedCommit] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.release?.commitId !== expectedCommit) {
  throw new Error('release manifest identity is invalid');
}
for (const relativePath of Object.values(manifest.expectedPaths || {})) {
  if (typeof relativePath !== 'string' || relativePath.startsWith('/') || relativePath.includes('..')) {
    throw new Error('release manifest contains an unsafe expected path');
  }
}
for (const record of manifest.criticalFiles || []) {
  const filePath = require('node:path').join(require('node:path').dirname(manifestPath), record.path);
  const bytes = fs.readFileSync(filePath);
  const digest = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== record.bytes || digest !== record.sha256) throw new Error(`critical file mismatch: ${record.path}`);
}
NODE

[[ -f "$staged/jgantts-server/package-lock.json" && -f "$staged/jgantts-com/dist/index.html" ]] \
  || { echo "release entry points are missing" >&2; exit 65; }
if [[ -n "$(find "$staged" \( -type l -o -name '.env' -o -name '.env.*' \) -print -quit)" ]]; then
  echo "release contains a link or environment file before maps setup" >&2
  exit 65
fi

if [[ ! -e "$maps_mount" && ! -L "$maps_mount" ]]; then
  [[ -d "$legacy_maps" ]] || { echo "legacy maps directory is missing" >&2; exit 66; }
  temporary_maps_link="${maps_mount}.new.$$"
  ln -s "$legacy_maps" "$temporary_maps_link"
  mv "$temporary_maps_link" "$maps_mount"
fi
[[ -L "$maps_mount" && -d "$maps_mount" ]] || { echo "stable maps mount is not a readable directory symlink" >&2; exit 65; }
representative_map=$(find -L "$maps_mount" -type f -print -quit)
[[ -n "$representative_map" && -r "$representative_map" ]] \
  || { echo "stable maps mount contains no representative readable file" >&2; exit 65; }

mkdir -p "$staged/jgantts-com/PUBLIC/assets"
ln -s "$maps_mount" "$staged/jgantts-com/PUBLIC/assets/maps"

(
  cd "$staged/jgantts-server"
  npm ci --omit=dev --ignore-scripts=false
  npm ls --omit=dev
  node -e 'require("better-sqlite3"); require("sharp");'
)

[[ -d "$data_root" && -r "$data_root" ]] || { echo "persistent data root is unavailable" >&2; exit 66; }
printf '%s\n' "$actual_checksum" > "$staged/.artifact.sha256"
if [[ -n "$(find "$staged" -type f \( -name '.env' -o -name '.env.*' \) -print -quit)" ]]; then
  echo "release contains an environment file" >&2
  exit 65
fi
if [[ -n "$(find "$staged" -type f \( -iname '*credential*' -o -iname '*private-key*' \) -print -quit)" ]] \
  || grep -IRqE --binary-files=without-match \
    '(BEGIN [A-Z ]*PRIVATE KEY|(^|[^A-Z_])(PASSWORD|SECRET|ACCESS_TOKEN)=[^[:space:]]+)' "$staged"; then
  echo "release contains a probable credential" >&2
  exit 65
fi
mv "$staged" "$target"
chmod -R u=rwX,go=rX "$target"
deployment_uid=$(id -u "$deployment_user")
node - "$target" "$deployment_uid" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [root, expectedOwner] = process.argv.slice(2);
function visit(entryPath) {
  const stat = fs.lstatSync(entryPath);
  if (stat.uid !== Number(expectedOwner)) throw new Error(`unexpected owner: ${entryPath}`);
  if (!stat.isSymbolicLink()) {
    if ((stat.mode & 0o022) !== 0) throw new Error(`service-writable release path: ${entryPath}`);
    if (stat.isDirectory() && (stat.mode & 0o005) !== 0o005) throw new Error(`service-unreadable directory: ${entryPath}`);
    if (stat.isFile() && (stat.mode & 0o004) !== 0o004) throw new Error(`service-unreadable file: ${entryPath}`);
  }
  if (stat.isDirectory()) for (const name of fs.readdirSync(entryPath)) visit(path.join(entryPath, name));
}
visit(root);
NODE
trap - EXIT
rm -rf -- "$temporary_parent"
duration_seconds=$(( $(date +%s) - started_at ))
printf '{"event":"release_install_completed","release":"%s","durationSeconds":%d}\n' "$expected_commit" "$duration_seconds"
echo "Installed inactive release: $target (service: $service_name)"
