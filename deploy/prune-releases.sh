#!/usr/bin/env bash

set -euo pipefail

release_root=${1-}
keep_prior=${2:-3}
[[ -n "$release_root" && "$release_root" == /* && "$release_root" != / && "$release_root" != */../* ]] || exit 64
[[ "$keep_prior" =~ ^[0-9]+$ ]] || exit 64
release_root=$(realpath "$release_root")
releases="$release_root/releases"
[[ -d "$releases" && ! -L "$releases" ]] || { echo "invalid releases directory" >&2; exit 65; }

protected='|'
for link in current previous; do
  if [[ -L "$release_root/$link" ]]; then
    resolved=$(realpath "$release_root/$link")
    [[ "$(dirname "$resolved")" == "$releases" ]] || { echo "$link resolves outside releases" >&2; exit 65; }
    protected+="$(basename "$resolved")|"
  fi
done

candidate_list=$(mktemp)
trap 'rm -f -- "$candidate_list"' EXIT
node - "$releases" > "$candidate_list" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
for (const entry of fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
  .map((entry) => ({ path: path.join(root, entry.name), mtime: fs.statSync(path.join(root, entry.name)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)) process.stdout.write(entry.path + '\n');
NODE

kept_prior=0
while IFS= read -r candidate; do
  name=$(basename "$candidate")
  [[ "$name" =~ ^[0-9a-fA-F]{40}$ && -d "$candidate" && ! -L "$candidate" ]] || continue
  [[ "$protected" == *"|$name|"* ]] && continue
  if (( kept_prior < keep_prior )); then
    kept_prior=$((kept_prior + 1))
    continue
  fi
  resolved=$(realpath "$candidate")
  [[ "$(dirname "$resolved")" == "$releases" && "$(basename "$resolved")" == "$name" ]] \
    || { echo "refusing unsafe release deletion: $candidate" >&2; exit 65; }
  chmod -R u+w "$resolved"
  rm -rf -- "$resolved"
  echo "Pruned release: $name"
done < "$candidate_list"
rm -f -- "$candidate_list"
trap - EXIT
