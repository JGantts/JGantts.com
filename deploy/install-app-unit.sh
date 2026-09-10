#!/usr/bin/env bash

set -euo pipefail

[[ $(id -u) -eq 0 ]] || { echo "run as root" >&2; exit 77; }
source_unit=/usr/local/libexec/jgantts/jgantts-com-node-app.service
target_unit=/etc/systemd/system/jgantts-com-node-app.service
[[ -f "$source_unit" && ! -L "$source_unit" ]] || { echo "provisioned application unit is missing" >&2; exit 66; }
if ! cmp --silent "$source_unit" "$target_unit" 2>/dev/null; then
  install -o root -g root -m 0644 "$source_unit" "$target_unit"
  systemctl daemon-reload
  echo "Installed current-based application unit"
else
  echo "Application unit is already current"
fi
