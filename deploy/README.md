# Main-site release deployment

Production uses two distinct local identities:

- `jgantts-deploy` owns `/home/jgantts-com/node-js`, installs immutable releases,
  and may invoke only the service commands listed in
  `systemd/jgantts-deploy.sudoers`.
- `jgantts-com` runs the application. It can read releases and write only under
  `/var/lib/jgantts`.

Install `systemd/jgantts-com-node-app.service` at
`/etc/systemd/system/jgantts-com-node-app.service` and the reviewed sudoers file
at `/etc/sudoers.d/jgantts-deploy`. Validate the latter with `visudo -cf` before
opening a deployment session. Create `/etc/jgantts-com/jgantts-com.env` from the
example with mode `0640`, owner `root`, and group `jgantts-com`; replace every
placeholder and never copy that file into a release.

The `production` GitHub environment must be restricted to the `prod` branch. It
owns `LINODE_IP`, `LINODE_USER`, and `LINODE_PASSWORD`. Password authentication
is a temporary compatibility path; migrate the workflow back to a dedicated,
passphrase-protected deployment key with pinned host-fingerprint verification.
Reviewer approval is an explicit repository-owner choice and must be recorded in
the roadmap after it is configured.

Install the distribution's `acl` package. After reviewing every file, run
`provision-host.sh DEPLOYMENT_USER jgantts-com` as root. It grants the deployment
account traverse-only access to the service home, read-only access to persistent
content, and ownership of the backup area. It also installs the versioned unit
files and maintenance scripts, validates the narrow sudoers policy, creates only
`.example` credential files, and does not replace or restart the application
unit. Populate both environment files before enabling the timers. During the
first release deployment, the workflow backs up and restarts the legacy service
first, then invokes the narrowly authorized `install-app-unit.sh`; activation
creates `current` before restarting through that new unit. The
release-maintenance timer is enabled only after a `current` link exists.

Install `restic` from the distribution's signed package repository, initialize
the off-host repository, and populate `backup.env`. The daily replication timer
checks local backup age and free capacity, verifies SQLite, uploads with restic,
checks the remote repository, and applies 7-daily/5-weekly/12-monthly retention.
The monthly rehearsal timer restores into `/var/lib/jgantts/rehearsals`, writes a
verification report, and deletes the temporary restore. Both timers invoke the
operations webhook on failure.

The daily release-maintenance timer compares the installed systemd unit with
the provisioned reference, validates `current` against its manifest and
`/api/build`, checks release permissions, and then retains `current`, `previous`,
and the three newest additional releases. It resolves every deletion candidate
and refuses paths outside the `releases` directory.

Before the first atomic deployment, install the unit, create the persistent data
tree, and confirm the legacy maps directory contains a readable representative
file. The first successful activation establishes `current`; every later
activation records `previous` and can roll back automatically. Do not use an
intentional broken release for the first activation because no preceding release
exists yet.
