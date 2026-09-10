#!/usr/bin/env bash

set -euo pipefail

unit=${1-}
[[ "$unit" =~ ^jgantts-[A-Za-z0-9@_.-]+\.service$ ]] || { echo "invalid failed unit" >&2; exit 64; }
[[ -n "${OPERATIONS_ALERT_WEBHOOK-}" ]] || { echo "operations alert webhook is not configured" >&2; exit 78; }
# shellcheck disable=SC2016
payload=$(node -e 'process.stdout.write(JSON.stringify({text:`JGantts production operation failed: ${process.argv[1]}`}))' "$unit")
curl --fail --silent --show-error --max-time 10 \
  --header 'content-type: application/json' --data "$payload" "$OPERATIONS_ALERT_WEBHOOK"
echo "Sent operations failure alert for $unit"
