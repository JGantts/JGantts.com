#!/usr/bin/env bash

set -euo pipefail

repository_root=$(cd "$(dirname "$0")/.." && pwd)
test_root=$(mktemp -d)
trap 'rm -rf -- "$test_root"' EXIT
mkdir -p "$test_root/bin" "$test_root/data" "$test_root/maps" "$test_root/app/releases"
printf 'map\n' > "$test_root/maps/regions.json"
real_node=$(command -v node)

cat > "$test_root/bin/node" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1-}" == -e && "${2-}" == *'require("better-sqlite3")'* ]]; then exit 0; fi
exec "$REAL_NODE" "$@"
SH
cat > "$test_root/bin/npm" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
[[ "${FAIL_NPM-}" != 1 ]]
SH
chmod +x "$test_root/bin/node" "$test_root/bin/npm"

make_artifact() {
  local sha=$1 source="$test_root/source-$1" archive="$test_root/$1.tar.gz"
  mkdir -p "$source/$sha/jgantts-server/dist" "$source/$sha/jgantts-com/dist" "$source/$sha/jgantts-com/PUBLIC"
  printf '{}\n' > "$source/$sha/jgantts-server/package-lock.json"
  printf '{}\n' > "$source/$sha/jgantts-server/package.json"
  printf 'server\n' > "$source/$sha/jgantts-server/dist/server.js"
  printf 'index\n' > "$source/$sha/jgantts-com/dist/index.html"
  printf '{"schemaVersion":1,"release":{"commitId":"%s"},"expectedPaths":{},"criticalFiles":[]}\n' "$sha" \
    > "$source/$sha/release-manifest.json"
  tar -czf "$archive" -C "$source" "$sha"
  sha256sum "$archive" | awk '{print $1}'
}

good_sha=4444444444444444444444444444444444444444
bad_sha=5555555555555555555555555555555555555555
good_checksum=$(make_artifact "$good_sha")
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" \
  "$repository_root/deploy/install-release.sh" --release-root "$test_root/app" \
  --artifact "$test_root/$good_sha.tar.gz" --expected-checksum "$good_checksum" \
  --expected-commit "$good_sha" --service test-service --service-user nobody \
  --data-root "$test_root/data" --maps-mount "$test_root/app/shared/maps-current" \
  --legacy-maps "$test_root/maps"
ln -s "$test_root/app/releases/$good_sha" "$test_root/app/current"

bad_checksum=$(make_artifact "$bad_sha")
set +e
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" \
  "$repository_root/deploy/install-release.sh" --release-root "$test_root/app" \
  --artifact "$test_root/$bad_sha.tar.gz" --expected-checksum "$(printf '0%.0s' {1..64})" \
  --expected-commit "$bad_sha" --service test-service --service-user nobody \
  --data-root "$test_root/data" --maps-mount "$test_root/app/shared/maps-current" \
  --legacy-maps "$test_root/maps" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 && ! -e "$test_root/app/releases/$bad_sha" ]]
[[ "$(realpath "$test_root/app/current")" == "$(realpath "$test_root/app/releases/$good_sha")" ]]

set +e
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" FAIL_NPM=1 \
  "$repository_root/deploy/install-release.sh" --release-root "$test_root/app" \
  --artifact "$test_root/$bad_sha.tar.gz" --expected-checksum "$bad_checksum" \
  --expected-commit "$bad_sha" --service test-service --service-user nobody \
  --data-root "$test_root/data" --maps-mount "$test_root/app/shared/maps-current" \
  --legacy-maps "$test_root/maps"
status=$?
set -e
[[ "$status" -ne 0 && ! -e "$test_root/app/releases/$bad_sha" ]]
[[ "$(realpath "$test_root/app/current")" == "$(realpath "$test_root/app/releases/$good_sha")" ]]

echo 'Inactive install success and dependency-failure isolation tests passed.'
