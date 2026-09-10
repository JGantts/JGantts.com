# Maps Deployment Roadmap

Last updated: 2026-09-09

## Objective

Replace the destructive in-place maps upload with a reproducible, versioned,
checksummed deployment that can be activated and rolled back atomically. A map
build or transfer failure must leave the active map dataset untouched, and map
deployment must remain independent from ordinary application releases.

This roadmap starts only after the completion gate in
`MAIN-SITE-DEPLOYMENT-ROADMAP.md` passes. It reuses that roadmap's production
concurrency, credentials, release-manifest conventions, shared maps mount,
verification reporting, and safe retention patterns.

```text
source images + configuration + pinned tools
                     |
                     v
        restore verified cache -> build dirty outputs
                     |
                     v
       complete manifest and checksum validation
                     |
                     v
 upload inactive map release -> verify -> switch maps-current
                                      |             |
                                      +-- rollback <-+
```

## How to use this file

- Do not start this roadmap until the main-site roadmap completion gate passes.
- Mark an item `[~]` while it is active and `[x]` only after implementation and
  relevant verification are complete.
- Keep no more than one item active unless work is deliberately parallel.
- Update **Current state**, the date, and the decision log whenever material
  implementation progress is made.
- Treat generated maps as rebuildable release artifacts, not manually maintained
  server content.

## Current state

- Status: Blocked on completion of `MAIN-SITE-DEPLOYMENT-ROADMAP.md` by design.
- Active item: None.
- Next item after the prerequisite passes: 1.1 — define the map release contract.
- The current workflow builds on a self-hosted runner and uploads directly to
  `/home/jgantts-com/node-js/jgantts-com/PUBLIC/assets/maps/`.
- The SCP step sets `rm: true`, which removes the active target before upload. A
  failed or interrupted transfer can therefore leave maps missing or partial.
- The Python builder describes itself as incremental, but a normal clean checkout
  does not provide a durable prior `maps-rendered` output or hash database. The
  production build generally has no previous output to reuse.
- Python requirements have no version or hash pins. The PMTiles executable is
  downloaded at runtime without checksum or signature verification.
- Deployment does not validate the complete declared layer set, file checksums,
  representative PMTiles range requests, or client-readable map behavior after
  activation.

## Fixed architecture decisions

1. A map release is a complete immutable dataset. Activation never deletes or
   modifies the dataset currently selected by `shared/maps-current`.
2. Map releases use a distinct identity and retention policy from application
   releases, even when both originate from the same Git commit.
3. Application releases continue referring only to `shared/maps-current`.
   Normal map activation therefore requires no application rebuild or restart.
4. Build caching is an optimization, never the source of truth. A release must
   pass a full manifest-to-filesystem validation regardless of cache hits.
5. The manifest describes every allowed output. Files absent from the manifest
   are not copied into a new release, so deleted layers cannot survive as stale
   production files.
6. Tool and dependency versions are pinned and verified. Remote downloads use a
   reviewed checksum or a trusted, immutable artifact prepared ahead of time.
7. All files are uploaded to and checked in an inactive directory before the
   maps symlink changes.
8. A failed post-activation map smoke test restores the preceding symlink. No
   destructive cleanup runs until the rollback window has passed.
9. When one commit changes both application and maps, build work may occur in
   parallel, but activation is ordered: verify and activate the main site first,
   then verify and activate its compatible map release.
10. Map schema and URL changes remain backward compatible for at least the active
    and preceding application releases. Breaking client/map changes require an
    explicit coordinated rollout plan.

## Target production layout

The layout extends the main-site release structure:

```text
/home/jgantts-com/node-js/
  shared/
    maps-current -> map-releases/<active-map-release-id>
    maps-previous -> map-releases/<preceding-map-release-id>
  map-releases/
    <map-release-id>/
      map-release-manifest.json
      build_hashes.json
      geo-data/
        regions.json
      world/
      ... complete declared map dataset ...
```

Each main-site release continues to contain:

```text
jgantts-com/PUBLIC/assets/maps -> /home/jgantts-com/node-js/shared/maps-current
```

The map release ID should include the full source commit SHA. If the same commit
can be rebuilt with intentionally changed tool inputs, append an immutable build
or workflow-attempt identifier and retain both the source SHA and artifact
checksum in the manifest.

## Map release manifest

Each map artifact must carry a versioned manifest containing at least:

- Map release ID and source Git commit SHA.
- Workflow run ID and attempt.
- Manifest and builder schema versions.
- Python version plus exact dependency versions.
- GDAL, PMTiles, and other external tool versions and verified artifact hashes.
- Hashes of all source files and map configuration inputs.
- For every output: relative path, media type, byte size, SHA-256, layer ID,
  light/dark variant, bounds, and supported zoom range where applicable.
- Expected `regions.json` checksum and its declared layer-to-output mapping.
- Total file count and byte size for capacity checks.

Only normalized relative paths may appear. Reject absolute paths, `..`, duplicate
paths, unexpected symlinks, and case-colliding names before packaging or upload.

## Implementation checklist

### Phase 1 — Release contract and shared deployment controls

- [ ] **1.1** Define and test the map release ID, manifest schema, directory
  layout, allowed media types, required files, and compatibility rules with the
  active and preceding application releases.
- [ ] **1.2** Move map mutation under the production environment and deployment
  serialization established by the main-site roadmap. Ensure a map-only run and
  a combined app/map run cannot interleave with another production activation.
- [ ] **1.3** Remove password-based inputs and mutable action tags from the map
  job by reusing the main deployment key, verified host fingerprint, least-
  privilege account, and full-SHA action pins.
- [ ] **1.4** Add explicit workflow dependencies so a combined run activates and
  verifies the main site before activating maps. A failed or skipped map release
  must not roll back an otherwise healthy, compatible application release.
- [ ] **1.5** Add a compatibility test proving both the active and preceding
  application clients can parse the proposed `regions.json` and construct every
  declared map URL.

Exit condition: map artifacts and activation have an explicit identity,
compatibility contract, and single-writer production boundary.

### Phase 2 — Reproducible and genuinely incremental builds

- [ ] **2.1** Pin every Python dependency to an exact compatible version. Produce
  and enforce hashes or a locked dependency artifact appropriate for the Python
  tooling in use.
- [ ] **2.2** Pin GDAL and related system tooling through a documented runner
  image or provisioning definition. Download the PMTiles CLI from an immutable
  version and verify its published SHA-256 before execution.
- [ ] **2.3** Include builder code, configuration, source bytes, and toolchain
  identity in each layer's build key. Increment a builder schema version whenever
  output semantics change without a corresponding source-file change.
- [ ] **2.4** Persist the prior complete output and build metadata in a bounded,
  checksummed Actions cache or artifact. Restore only entries whose cache schema
  and toolchain identity match the current build.
- [ ] **2.5** Copy a cached output into a new staging tree, rebuild dirty entries
  into temporary paths, verify each completed file, and atomically replace that
  entry in staging. Never write a partial result over a valid cached file.
- [ ] **2.6** Prune staging outputs that are no longer declared by current source
  configuration. Add a regression test proving removal of a layer removes its
  files from the next release even when the previous output is cached.
- [ ] **2.7** Add a clean full-rebuild mode and periodically compare its manifest
  and output hashes with an incremental build from the same inputs.

Exit condition: identical inputs and tools produce a complete validated dataset,
cache hits save work, and removed or dirty layers cannot leak stale output.

### Phase 3 — Artifact validation

- [ ] **3.1** Generate `map-release-manifest.json` from the completed staging
  tree, then independently verify every manifest entry, checksum, size, and
  allowed path before packaging.
- [ ] **3.2** Cross-check `regions.json` against the manifest. Require every
  declared light/dark and single/tiled layer output, and reject orphan outputs
  unless the manifest schema explicitly permits them.
- [ ] **3.3** Open every PMTiles file with the pinned tooling and validate its
  header, bounds, zoom range, directory, and readable sample tile. Decode and
  validate representative PNG outputs.
- [ ] **3.4** Enforce reasonable lower and upper bounds for per-file size, total
  artifact size, and file count. Require an explicit reviewed override for an
  exceptional growth event before transferring it to production.
- [ ] **3.5** Package the complete dataset once, upload it as a retained workflow
  artifact, and record its SHA-256. The deployment job must use exactly this
  artifact rather than rebuilding or copying a mutable runner directory.

Exit condition: corrupt, incomplete, stale, unexpectedly large, or internally
inconsistent map artifacts fail before contacting production.

### Phase 4 — Upload an inactive map release

- [ ] **4.1** Add a repository-owned remote map deployment script with explicit,
  validated release-root, release-ID, artifact, checksum, and shared-link
  arguments. Reject unsafe paths before any extraction or cleanup.
- [ ] **4.2** Check free disk space against the incoming artifact, its extracted
  size, the active and rollback releases, and a safety margin before upload.
- [ ] **4.3** Transfer into a unique temporary directory under `map-releases/`,
  verify the bundle checksum, validate archive paths, extract it, and rerun the
  complete manifest verification on the server.
- [ ] **4.4** Rename the fully verified directory to its immutable map release ID.
  Refuse to overwrite an existing ID unless its artifact and manifest checksums
  are identical.
- [ ] **4.5** Verify the service account can traverse and read every required
  directory while map release files remain non-writable by the web process.

Exit condition: a complete server-side map release is verified without changing
`shared/maps-current` or any response served to users.

### Phase 5 — Atomic activation, verification, and rollback

- [ ] **5.1** Record the resolved active map release, update `maps-previous`, and
  atomically replace `maps-current` with the new release. Never delete the
  current target before or during upload.
- [ ] **5.2** Run origin-level smoke tests through the public application path:
  fetch `regions.json`, request representative light and dark images, and verify
  PMTiles byte-range responses, content types, sizes, and expected header bytes.
- [ ] **5.3** Add a browser-level smoke test that opens the map experience,
  confirms its initial region renders, changes at least one layer, and detects
  console, fetch, parsing, CORS, or protocol errors.
- [ ] **5.4** If any smoke test fails, atomically restore the prior map release
  and rerun origin verification. Preserve the failed release and diagnostics,
  and keep the workflow failed even when rollback succeeds.
- [ ] **5.5** Record the active and preceding map IDs, application release SHA,
  manifest checksum, total bytes, activation result, and rollback result in the
  deployment summary.
- [ ] **5.6** Prove rollback with an intentionally invalid canary map release and
  verify that normal application pages remain healthy throughout the exercise.

Exit condition: a map release changes through one reversible symlink operation,
and failure testing proves that the prior dataset is restored automatically.

### Phase 6 — Caching, retention, and monitoring

- [ ] **6.1** Retain the active and rollback map releases plus a bounded number of
  prior successful releases. Base retention on both count and disk capacity
  because map artifacts may be large.
- [ ] **6.2** Clean only resolved inactive directories strictly beneath
  `map-releases/`. Never follow or delete `maps-current`, `maps-previous`, an
  application release, the legacy target, or `/var/lib/jgantts`.
- [ ] **6.3** Add alerts for map build failure, activation failure, automatic
  rollback, manifest drift, HTTP range failure, and release-volume capacity.
- [ ] **6.4** Record cache hit rate, rebuilt layer count, build duration, artifact
  size, transfer duration, verification duration, and current release identity.
- [ ] **6.5** Run a scheduled public map canary that verifies `regions.json`, a
  PMTiles range, and a raster output without downloading the complete dataset.
- [ ] **6.6** Set cache and workflow-artifact retention independently from server
  release retention. A missing cache must cause a slower full build, never block
  the ability to produce a release.

Exit condition: resource use is bounded, map failures are visible, and a cache
loss or corrupt cache cannot affect correctness.

### Phase 7 — Legacy cleanup and operational handoff

- [ ] **7.1** After at least one successful map activation and rollback drill,
  confirm every active and retained application release reads through
  `shared/maps-current` rather than the legacy target.
- [ ] **7.2** Remove `rm: true` and the direct upload to
  `jgantts-com/PUBLIC/assets/maps` from the workflow. Ensure no other automation
  or manual runbook still writes there.
- [ ] **7.3** Preserve the legacy dataset for the documented rollback window,
  then remove it through a separately reviewed, exact-path cleanup after proving
  it is not the destination of any symlink.
- [ ] **7.4** Update `CONTENT-OPERATIONS.md` with map release inspection, manual
  activation, automatic and manual rollback, cache recovery, disk-capacity
  response, and safe cleanup procedures.
- [ ] **7.5** Perform a final production deployment containing both application
  and map changes. Verify ordered activation, both release identities, browser
  behavior, rollback boundaries, logs, and retention.

Exit condition: the destructive legacy path is retired, the new process is
documented, and a combined application/maps deployment is proven in production.

## Verification matrix

| Scenario | Required result |
| --- | --- |
| Map build fails | Active map release remains unchanged |
| Upload is interrupted | `maps-current` continues serving the complete old dataset |
| Artifact checksum differs | Inactive release is rejected before extraction or activation |
| Layer is removed | Its outputs are absent from the new manifest and release |
| Cache is absent or corrupt | A clean rebuild succeeds and produces a valid complete artifact |
| PMTiles range request fails | Activation rolls back automatically |
| Browser cannot parse regions | Activation rolls back automatically |
| Two map commits arrive quickly | Production activation is serialized and ends on the newest queued release |
| App and maps change together | Main site activates and verifies before compatible maps activate |
| New maps fail after app succeeds | Maps roll back without replacing the healthy application release |
| Release disk is nearly full | Deployment fails safely before transfer or cleanup of protected releases |

## Decision log

### 2026-09-09 — Initial roadmap

- Made the main-site deployment roadmap an explicit prerequisite so maps can
  reuse its production lock, credentials, manifest conventions, shared mount,
  and rollback mechanics.
- Chose separate immutable map releases because generated maps are large,
  expensive, independently deployable, and require domain-specific validation.
- Preserved incremental building as an optimization while requiring a complete
  manifest and periodic clean-build comparison for correctness.
- Chose a shared atomic symlink so a map deployment does not require rebuilding
  or restarting the application.

