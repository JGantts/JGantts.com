#!/usr/bin/env bash

set -euo pipefail

repository_root=$(cd "$(dirname "$0")/.." && pwd)
test_root=$(mktemp -d)
cleanup() {
  chmod -R u+w "$test_root" 2>/dev/null || true
  rm -rf -- "$test_root"
}
trap cleanup EXIT

mkdir -p "$test_root/bin" "$test_root/app/releases" "$test_root/data"
real_node=$(command -v node)
cat > "$test_root/bin/node" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1-}" == */dist/cli/check-schema-compatibility.js ]]; then exit 0; fi
if [[ "${1-}" == */dist/cli/backup-content.js || "${1-}" == dist/cli/backup-content.js ]]; then
  [[ "${FAIL_BACKUP-}" != 1 ]] || exit 1
  destination=${2:?}
  mkdir -p "$destination/media/originals" "$destination/media/derived"
  touch "$destination/content.sqlite" "$destination/media/originals/example.jpg"
  exit 0
fi
if [[ "${1-}" == -e && "${2-}" == *better-sqlite3* ]]; then exit 0; fi
if [[ "${1-}" == */smoke-test.js ]]; then
  [[ "${EXPECTED_COMMIT_SHA-}" != "${FAIL_SHA-}" ]]
  exit
fi
exec "$REAL_NODE" "$@"
SH
cat > "$test_root/bin/sudo" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1-}" == systemctl && "${2-}" == restart ]]; then printf 'active\n' > "$SERVICE_STATE"; exit 0; fi
if [[ "${1-}" == systemctl && "${2-}" == stop ]]; then printf 'inactive\n' > "$SERVICE_STATE"; exit 0; fi
if [[ "${1-}" == systemctl && "${2-}" == is-active ]]; then grep -qx active "$SERVICE_STATE"; exit; fi
if [[ "${1-}" == journalctl ]]; then exit 0; fi
exit 1
SH
chmod +x "$test_root/bin/node" "$test_root/bin/sudo"
touch "$test_root/smoke-test.js"
printf 'active\n' > "$test_root/service-state"

old_sha=1111111111111111111111111111111111111111
new_sha=2222222222222222222222222222222222222222
bad_sha=3333333333333333333333333333333333333333
for sha in "$old_sha" "$new_sha" "$bad_sha"; do
  release="$test_root/app/releases/$sha"
  mkdir -p "$release/jgantts-server/dist/cli"
  printf '{"release":{"commitId":"%s"}}\n' "$sha" > "$release/release-manifest.json"
  touch "$release/jgantts-server/dist/cli/check-schema-compatibility.js"
  touch "$release/jgantts-server/dist/cli/backup-content.js"
done
ln -s "$test_root/app/releases/$old_sha" "$test_root/app/current"

PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" SERVICE_STATE="$test_root/service-state" \
  "$repository_root/deploy/activate-release.sh" \
  --release-root "$test_root/app" --release-sha "$new_sha" --service test-service \
  --data-root "$test_root/data" --origin https://example.com \
  --smoke-script "$test_root/smoke-test.js" --summary "$test_root/success.json"
[[ "$(realpath "$test_root/app/current")" == "$test_root/app/releases/$new_sha" ]]
[[ "$(realpath "$test_root/app/previous")" == "$test_root/app/releases/$old_sha" ]]
grep -q '"result": "success"' "$test_root/success.json"

set +e
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" SERVICE_STATE="$test_root/service-state" FAIL_SHA="$bad_sha" \
  "$repository_root/deploy/activate-release.sh" \
  --release-root "$test_root/app" --release-sha "$bad_sha" --service test-service \
  --data-root "$test_root/data" --origin https://example.com \
  --smoke-script "$test_root/smoke-test.js" --summary "$test_root/rollback.json"
status=$?
set -e
[[ "$status" -eq 72 ]]
[[ "$(realpath "$test_root/app/current")" == "$test_root/app/releases/$new_sha" ]]
grep -q '"result": "rolled-back"' "$test_root/rollback.json"

mkdir -p "$test_root/data/backups"
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" SERVICE_STATE="$test_root/service-state" \
  "$repository_root/deploy/backup-release.sh" \
  --release-root "$test_root/app" --release-sha "$new_sha" --service test-service \
  --data-root "$test_root/data" --backup-root "$test_root/data/backups/pre-deploy"
[[ -L "$test_root/data/backups/pre-deploy/latest" ]]
grep -qx active "$test_root/service-state"

set +e
PATH="$test_root/bin:$PATH" REAL_NODE="$real_node" SERVICE_STATE="$test_root/service-state" FAIL_BACKUP=1 \
  "$repository_root/deploy/backup-release.sh" \
  --release-root "$test_root/app" --release-sha "$new_sha" --service test-service \
  --data-root "$test_root/data" --backup-root "$test_root/data/backups/failing" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
grep -qx active "$test_root/service-state"

echo 'Activation, automatic rollback, and quiesced backup tests passed.'
