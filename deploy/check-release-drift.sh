#!/usr/bin/env bash

set -euo pipefail

release_root=${1-}
origin=${2-}
installed_unit=${3-}
expected_unit=${4-}
[[ -n "$release_root" && "$release_root" == /* && "$release_root" != / ]] || exit 64
[[ "$origin" =~ ^https://[^/]+/?$ ]] || exit 64
for file in "$installed_unit" "$expected_unit"; do [[ -f "$file" && ! -L "$file" ]] || exit 66; done
cmp --silent "$installed_unit" "$expected_unit" || { echo "systemd unit drift detected" >&2; exit 65; }

release_root=$(realpath "$release_root")
current=$(realpath "$release_root/current")
[[ "$(dirname "$current")" == "$release_root/releases" ]] || { echo "current points outside releases" >&2; exit 65; }
manifest="$current/release-manifest.json"
[[ -f "$manifest" ]] || { echo "active manifest is missing" >&2; exit 66; }
manifest_sha=$(node -e 'const m=require(process.argv[1]); process.stdout.write(m.release.commitId)' "$manifest")
[[ "$manifest_sha" == "$(basename "$current")" ]] || { echo "active manifest identity drift" >&2; exit 65; }
reported_sha=$(curl --fail --silent --show-error --max-time 10 "$origin/api/build" \
  | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).commitId))')
[[ "$reported_sha" == "$manifest_sha" ]] || { echo "running process identity drift" >&2; exit 65; }

node - "$current" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
function visit(entryPath) {
  const stat = fs.lstatSync(entryPath);
  if (!stat.isSymbolicLink() && (stat.mode & 0o022) !== 0) throw new Error(`writable release path: ${entryPath}`);
  if (stat.isDirectory()) for (const name of fs.readdirSync(entryPath)) visit(path.join(entryPath, name));
}
visit(process.argv[2]);
NODE
echo "Release drift check passed: $manifest_sha"
