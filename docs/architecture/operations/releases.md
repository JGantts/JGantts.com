# Release delivery

**Responsibility:** package verified builds, install immutable releases, activate the running application, and detect deployment drift.

**Entry points:** `prod` pushes trigger the deployment workflow; `package-release.js`, `install-release.sh`, and `activate-release.sh` implement delivery. Provisioning/systemd scripts establish the host runtime.

**Dependencies:** compiled frontend/server, build identity, release manifests/checksums, schema compatibility, systemd, health/build probes, and [backups](recovery.md).

**Consumers:** production Express/Vue delivery, operators, and scheduled drift/pruning jobs.

**Invariants:** `current`/`previous` identify releases and support rollback; activation checks the running identity. Runtime content stays outside releases. Deployment and service identities have distinct permissions. Map assets remain separately generated/deployed to the legacy public maps location; do not assume a site release contains them. Path filters decide which workflow jobs run; `build_toggle` can trigger site delivery.

**Source:** [workflow](../../../.github/workflows/deploy.yml), [packager](../../../scripts/package-release.js), [deployment scripts and tests](../../../deploy), [units](../../../deploy/systemd). Host setup and retention details: [deployment README](../../../deploy/README.md).

[Operations map](index.md)
