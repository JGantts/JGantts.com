#!/usr/bin/env bash

set -euo pipefail

[[ $(id -u) -eq 0 ]] || { echo "run as root" >&2; exit 77; }
deployment_user=${1-}
service_user=${2-}
[[ "$deployment_user" =~ ^[A-Za-z_][A-Za-z0-9_.-]*[$]?$ ]] || { echo "invalid deployment user" >&2; exit 64; }
[[ "$service_user" == jgantts-com ]] || { echo "service unit currently requires jgantts-com" >&2; exit 64; }
[[ "$deployment_user" != "$service_user" ]] || { echo "deployment and service users must be distinct" >&2; exit 65; }
id "$deployment_user" >/dev/null
id "$service_user" >/dev/null
command -v setfacl >/dev/null || { echo "setfacl is required; install the acl package" >&2; exit 69; }

source_root=$(cd "$(dirname "$0")" && pwd)
install -d -o "$deployment_user" -g "$service_user" -m 0755 /home/jgantts-com/node-js
install -d -o "$deployment_user" -g "$service_user" -m 0755 \
  /home/jgantts-com/node-js/releases /home/jgantts-com/node-js/incoming /home/jgantts-com/node-js/shared
install -d -o "$service_user" -g "$service_user" -m 0750 \
  /var/lib/jgantts /var/lib/jgantts/media
install -d -o "$deployment_user" -g "$service_user" -m 0750 /var/lib/jgantts/backups
setfacl -m "u:${deployment_user}:--x" /home/jgantts-com
find /var/lib/jgantts -path /var/lib/jgantts/backups -prune -o -type d \
  -exec setfacl -m "u:${deployment_user}:r-x,d:u:${deployment_user}:r-x" {} +
find /var/lib/jgantts -path /var/lib/jgantts/backups -prune -o -type f \
  -exec setfacl -m "u:${deployment_user}:r--" {} +
chown -R "$deployment_user:$service_user" /var/lib/jgantts/backups
install -d -o root -g root -m 0755 /usr/local/libexec/jgantts /etc/jgantts-com

for script in replicate-backups.sh restore-rehearsal.sh operations-alert.sh prune-releases.sh check-release-drift.sh install-app-unit.sh; do
  install -o root -g root -m 0755 "$source_root/$script" "/usr/local/libexec/jgantts/$script"
done
install -o root -g root -m 0644 "$source_root/systemd/jgantts-com-node-app.service" \
  /usr/local/libexec/jgantts/jgantts-com-node-app.service
for unit in "$source_root"/systemd/*.service "$source_root"/systemd/*.timer; do
  [[ "$(basename "$unit")" == jgantts-com-node-app.service ]] && continue
  install -o root -g root -m 0644 "$unit" "/etc/systemd/system/$(basename "$unit")"
done

if [[ ! -f /etc/jgantts-com/jgantts-com.env ]]; then
  install -o root -g "$service_user" -m 0640 \
    "$source_root/systemd/jgantts-com.env.example" /etc/jgantts-com/jgantts-com.env.example
  echo "create /etc/jgantts-com/jgantts-com.env from its .example before starting the service" >&2
fi
if [[ ! -f /etc/jgantts-com/backup.env ]]; then
  install -o root -g root -m 0600 \
    "$source_root/systemd/backup.env.example" /etc/jgantts-com/backup.env.example
  echo "create /etc/jgantts-com/backup.env from its .example before enabling backup timers" >&2
fi

sudoers_temp=$(mktemp /etc/sudoers.d/jgantts-deploy.XXXXXX)
trap 'rm -f -- "$sudoers_temp"' EXIT
sed "s/^jgantts-deploy /$deployment_user /" "$source_root/systemd/jgantts-deploy.sudoers" > "$sudoers_temp"
chmod 0440 "$sudoers_temp"
visudo -cf "$sudoers_temp"
mv "$sudoers_temp" /etc/sudoers.d/jgantts-deploy
trap - EXIT

systemctl daemon-reload
if [[ -f /etc/jgantts-com/backup.env ]]; then
  systemctl enable --now jgantts-backup-replication.timer jgantts-restore-rehearsal.timer
fi
if [[ -L /home/jgantts-com/node-js/current ]]; then
  systemctl enable --now jgantts-release-maintenance.timer
fi
echo "Provisioned immutable-release host layout; application service was not restarted."
