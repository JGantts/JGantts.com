# Health, logs, and build identity

**Responsibility:** expose operational readiness and identify the code actually running.

**Entry points:** `HealthService.inspect`, structured/request logger factories, `loadBuildInfo`, `GET /api/health`, and `GET /api/build`.

**Dependencies:** database queries, media-directory permissions, outbox state, integration configuration, and build metadata generated during compilation.

**Consumers:** release activation/drift checks, smoke tests, operators, and the frontend build badge.

**Invariants:** build identity is captured at process startup; replacing metadata on disk cannot relabel an old process. Local development reports predictable development identity. Health distinguishes disabled integrations, degradation, and core failure; only unhealthy reports yield HTTP 503. Logs pass through centralized request/error handling rather than ad hoc HTTP responses.

**Source:** [health and logger](../../../jgantts-server/src/observability), [build loader](../../../jgantts-server/src/build-info.ts), [metadata writer](../../../jgantts-server/scripts/write-build-info.js), [error handler](../../../jgantts-server/src/middleware/error-handler.ts), [smoke tests](../../../jgantts-server/scripts/smoke-test.js).

[Server map](index.md)
