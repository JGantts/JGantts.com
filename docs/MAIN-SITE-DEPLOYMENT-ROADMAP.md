# Main Site Deployment Roadmap

Last updated: 2026-09-09

## Objective

Replace the in-place JGantts.com application deployment with a serialized,
versioned, verifiable release process. A failed copy, dependency installation,
restart, or health check must not leave production on a mixed or unidentified
release, and application rollback must not require rebuilding an old commit.

This roadmap is implemented before `MAPS-DEPLOYMENT-ROADMAP.md`. It establishes
the shared deployment conventions and a stable maps mount that the maps roadmap
will later adopt.

```text
build and test once -> upload inactive release -> verify inactive release
                                                    |
                                                    v
content backup -> atomic current switch -> restart -> live verification
                         ^                            |
                         +-------- rollback <--------+
```

## How to use this file

- Treat this file as the implementation state for the main site deployment.
- Mark an item `[~]` while it is active and `[x]` only after implementation and
  its relevant automated or production verification is complete.
- Keep no more than one item active unless work is deliberately parallel.
- Update **Current state**, the date, and the decision log whenever material
  implementation progress is made.
- Add newly discovered deployment work here rather than relying on chat history.
- Do not begin the maps deployment roadmap until the completion gate in this
  file has passed.

## Current state

- Status: Not started.
- Active item: None.
- Next item: 1.1 — serialize production deployment runs.
- The current workflow builds and tests the server, creates a content backup,
  copies application files directly over the live tree, runs `npm ci` in that
  tree, restarts systemd, and runs a live smoke test.
- Main site/server files are not removed before copying. Same-path files are
  replaced, but files removed from the repository can remain on the server.
- `npm ci` does clean and rebuild the live `node_modules` directory.
- Build information is deployed in a separate parallel job and is read from
  disk on every API request. It can therefore identify a new commit before that
  application is active, or even when its deployment fails.
- The current live smoke test detects a bad deployment but does not restore the
  preceding application release.
- Runtime content correctly remains outside the application tree under
  `/var/lib/jgantts` and must stay outside every release directory.

## Fixed architecture decisions

1. A release is an immutable directory identified by the full Git commit SHA.
   Never modify a release after it becomes eligible for activation.
2. Build and test one deployable artifact. Production receives the same bytes
   that passed the release checks; it does not rebuild application code.
3. Only one production deployment run may activate files at a time. Runs for
   different commits must not interleave copies, backups, dependency installs,
   symlink changes, restarts, or verification.
4. The active release is selected through an atomic `current` symlink change.
   Uploads and dependency installation occur only in a new inactive directory.
5. The server process captures its release identity at startup. The build API
   must report the running process's identity, not merely the contents of a file
   that can be changed independently.
6. A failed post-activation health or smoke check automatically returns
   `current` to the preceding release and restarts it. Failed releases remain
   available for diagnosis but are never reported as successful.
7. `/var/lib/jgantts` is persistent content, not release content. Application
   rollback does not replace or rewind this directory.
8. Database migrations use expand/contract compatibility. A release must remain
   rollback-compatible with the schema it may leave behind; any exception needs
   an explicit migration and recovery plan before deployment.
9. Maps remain independently deployable. During this roadmap, each application
   release mounts the existing maps directory through a stable shared symlink.
   The maps roadmap later changes the symlink's destination without changing the
   application release layout.
10. Deployment credentials use least privilege. The deployment account may
    create releases and invoke only the specifically required service actions;
    it does not receive unrestricted root access.

## Target production layout

The exact root may be made configurable, but the initial layout should resemble:

```text
/home/jgantts-com/node-js/
  current -> releases/<active-commit-sha>
  previous -> releases/<preceding-commit-sha>
  releases/
    <commit-sha>/
      release-manifest.json
      jgantts-server/
        dist/
        node_modules/
        package.json
        package-lock.json
        serve.js
      jgantts-com/
        dist/
        PUBLIC/
          assets/maps -> /home/jgantts-com/node-js/shared/maps-current
  shared/
    maps-current -> /home/jgantts-com/node-js/jgantts-com/PUBLIC/assets/maps

/var/lib/jgantts/
  content.sqlite
  media/
  backups/
```

`shared/maps-current` initially points to the current legacy maps target so map
deployments keep working while this roadmap is introduced. The maps roadmap
will repoint it to a versioned map release and retire the legacy target only
after verification.

## Release manifest

Every artifact and installed release must contain a machine-readable manifest
with at least:

- Full Git commit SHA and commit message.
- Workflow run ID and attempt.
- UTC build timestamp for diagnostics, not application identity.
- Node and npm versions used to build and test.
- SHA-256 and byte size for the artifact and critical entry points.
- Expected server, client index, and public-file paths.
- Manifest schema version.

The deployed manifest is created during the build and is never generated or
rewritten on the server. The running process validates and exposes the embedded
commit identity captured at startup.

## Implementation checklist

### Phase 1 — Immediate safety guardrails

- [ ] **1.1** Add workflow-level production concurrency so only one deployment
  run can mutate production at a time. Queue newer production runs rather than
  allowing an older run to finish after a newer commit.
- [ ] **1.2** Put all production-mutating jobs behind one GitHub `production`
  environment. Move SSH secrets into that environment and restrict it to the
  production branch; record whether reviewer approval is enabled.
- [ ] **1.3** Add `set -euo pipefail` to every remote shell entry point and remove
  diagnostic commands such as `whoami`. Ensure a failed `cd`, install, restart,
  or verification command makes the job fail immediately.
- [ ] **1.4** Replace password authentication with a dedicated, passphrase-
  protected deployment key where supported, verify the server's SSH host
  fingerprint, and restrict the corresponding server account and sudoers rule.
- [ ] **1.5** Update the old SSH action, then pin every third-party GitHub Action
  to a reviewed full commit SHA. Record the human-readable release version in a
  comment beside each pinned SHA.
- [ ] **1.6** As an interim safeguard, make the current live smoke failure
  conspicuous through the workflow conclusion and deployment environment. Do
  not describe a run as deployed merely because the build-info file changed.

Exit condition: production writes cannot overlap, remote failures cannot be
silently masked, and production access verifies both client and server identity.

### Phase 2 — Build one release artifact

- [ ] **2.1** Create a release-packaging script that collects only the required
  server build, server entry point, package manifests, frontend build, and
  frontend public files. Explicitly exclude runtime content, local environment
  files, development dependencies, editor artifacts, and generated maps.
- [ ] **2.2** Generate and validate `release-manifest.json` during packaging.
  Refuse to package missing entry points, an empty client build, an unexpected
  symlink, or a commit identity that differs from `github.sha`.
- [ ] **2.3** Run server checks, both production builds, and the compiled local
  smoke test before packaging. Avoid rebuilding those sources in a later job.
- [ ] **2.4** Upload the release bundle as a GitHub Actions artifact with an
  explicit retention period, then have the deployment job download that exact
  artifact. Verify its SHA-256 before transfer and again on the server.
- [ ] **2.5** Extend the smoke test to parse the deployed HTML and request its
  referenced JavaScript and stylesheet assets. Check their content types and
  reject missing or mismatched hashed assets.
- [ ] **2.6** Change build reporting so the running process exposes the manifest
  identity loaded at startup. Add a test proving that changing a file on disk
  cannot make an old process claim to be a new release.

Exit condition: there is one immutable, checksummed bundle whose tests and
commit identity can be traced from CI through production.

### Phase 3 — Install immutable release directories

- [ ] **3.1** Add a remote deployment script stored in the repository. Give it
  explicit arguments for the release root, artifact, expected SHA, service name,
  persistent data root, and stable maps mount; reject empty, relative, root, or
  otherwise unsafe paths.
- [ ] **3.2** Upload into a unique temporary directory beneath `releases/`,
  validate the archive before extraction, and rename the completed directory to
  `releases/<commit-sha>`. Refuse to overwrite an existing release whose
  manifest or checksum differs.
- [ ] **3.3** Run `npm ci --omit=dev` inside only the inactive release. Validate
  the production dependency tree and load native modules such as
  `better-sqlite3` and `sharp` before the release can be activated.
- [ ] **3.4** Create the release's `PUBLIC/assets/maps` symlink to
  `shared/maps-current`. Initialize `shared/maps-current` as the compatibility
  bridge to the existing maps directory and verify representative map files are
  readable through the release.
- [ ] **3.5** Validate ownership and permissions: release files are writable by
  the deployment account, readable by the service account, not writable by the
  service process, and contain no secrets.
- [ ] **3.6** Version the systemd unit and a non-secret environment template in
  the repository. Change `WorkingDirectory` and `ExecStart` to use `current`,
  retain graceful `SIGTERM`, and verify a bounded stop timeout.

Exit condition: a complete release can be installed and validated without
changing any byte visible through `current` or disrupting the running service.

### Phase 4 — Atomic activation and automatic application rollback

- [ ] **4.1** Record the currently resolved release, update `previous`, and
  atomically replace `current` with the new release symlink. Never use a
  remove-then-create sequence for the active link.
- [ ] **4.2** Restart systemd and require it to reach `active` within a bounded
  timeout. Capture targeted journal output in the failed workflow without
  exposing environment values or secrets.
- [ ] **4.3** Run live health, running-commit, homepage, server-rendered post,
  referenced static asset, missing-route, and admin fail-closed checks.
- [ ] **4.4** If restart or live verification fails, atomically restore the
  recorded release, restart it, and verify its health. Preserve both the failed
  release and logs for diagnosis, and fail the deployment job even when rollback
  succeeds.
- [ ] **4.5** Refuse automatic application rollback when the old release declares
  itself incompatible with the current database schema. Surface a clear manual
  recovery state instead of repeatedly restarting incompatible code.
- [ ] **4.6** Write the activated release, preceding release, timestamps, and
  verification result to the GitHub deployment summary and structured server
  logs.

Exit condition: activation is a single reversible switch, and a deliberately
broken release test proves production returns automatically to the prior app.

### Phase 5 — Migration and backup safety

- [ ] **5.1** Separate schema compatibility inspection from normal server
  startup. Document the schema range each release can read and enforce it before
  activation and rollback.
- [ ] **5.2** Adopt and test expand/contract migrations so the previous release
  remains usable throughout the rollback window. Require a dedicated rollout
  plan for destructive or irreversible schema work.
- [ ] **5.3** Verify the pre-deploy content backup before activation, while using
  the inactive release's tools rather than whichever application happens to be
  live. Preserve the existing SQLite integrity check and required media paths.
- [ ] **5.4** Close the database/media consistency window during backups by
  implementing a bounded write quiesce, filesystem snapshot, or another tested
  cross-resource snapshot mechanism. Reads should remain available if practical.
- [ ] **5.5** Replicate verified backups off the Linode before applying a
  documented retention policy. Alert on backup failure, replication lag, and
  backup-volume capacity.
- [ ] **5.6** Automate a periodic restore rehearsal into an isolated data root
  and record database integrity plus representative media checks. Never restore
  over the active data root during a rehearsal.

Exit condition: application rollback is schema-safe, and a verified, retained,
off-host content recovery path exists.

### Phase 6 — Retention, observability, and operational handoff

- [ ] **6.1** Retain the active release, the rollback release, and a small bounded
  number of prior successful releases. Delete only resolved paths beneath the
  configured release root; never follow `current`, `previous`, or shared links.
- [ ] **6.2** Add deployment metrics or structured events for build duration,
  transfer duration, dependency installation, restart, health convergence,
  rollback, and final active commit.
- [ ] **6.3** Add a scheduled drift check comparing the active manifest,
  systemd configuration, expected file permissions, and reported process commit.
- [ ] **6.4** Update `CONTENT-OPERATIONS.md` with normal deployment, application
  rollback, failed rollback, release inspection, retention, and emergency manual
  activation procedures.
- [ ] **6.5** Perform a production canary deployment, an intentional pre-switch
  failure, and a controlled post-switch failure. Record observed availability,
  recovery time, active SHA, backup, logs, and cleanup.
- [ ] **6.6** Mark the shared maps compatibility mount as stable and ready for
  `MAPS-DEPLOYMENT-ROADMAP.md`. Do not remove the legacy map directory yet.

Exit condition: the process is observable, documented, capacity-bounded, and
proven in production failure drills.

## Completion gate for the maps roadmap

The maps roadmap may begin only after all of the following are true:

- Production deployments are serialized across workflow runs.
- Main-site releases are immutable and activated through `current`.
- The running server reports its startup-captured release SHA.
- Failed application activation automatically rolls back successfully.
- Every app release reads maps through `shared/maps-current`.
- The existing maps workflow still deploys successfully through the compatibility
  destination.
- Production operations and emergency rollback are documented.

## Verification matrix

| Scenario | Required result |
| --- | --- |
| Upload interrupted | Active release and process remain unchanged |
| Dependency install fails | Inactive release is rejected; production remains healthy |
| Restart fails | `current` and systemd return to the preceding healthy release |
| Live smoke fails | Automatic rollback succeeds and the workflow remains failed |
| Two commits arrive quickly | Activations are serialized and the newest queued commit wins |
| Obsolete file removed in Git | It is absent from the new immutable release |
| Build-info file is altered | Running process identity does not change |
| Additive migration is applied | Both new and preceding releases can start and serve requests |
| Backup fails | Activation never begins |
| Maps deploy during transition | Maps remain readable through `shared/maps-current` |

## Decision log

### 2026-09-09 — Initial roadmap

- Split application and maps hardening into sequential roadmaps because their
  build costs, release cadence, verification, and rollback units differ.
- Chose immutable release directories and atomic symlinks over cleaning the live
  tree. This removes stale files without exposing production to a destructive
  pre-copy deletion.
- Kept persistent content outside releases and treated database compatibility as
  a separate constraint from application rollback.
- Added a compatibility maps symlink so main-site deployment can be completed
  without waiting for the maps pipeline redesign.

