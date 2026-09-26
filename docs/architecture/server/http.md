# Runtime and HTTP boundaries

**Responsibility:** assemble the backend and expose public, administrative, and static routes.

**Entry points:** `startServer()` constructs dependencies and starts the outbox worker; `createApp(AppOptions)` supports injected services/templates for tests. `createApiRouter` mounts public posts, health/build, sessions, and admin routers.

**Dependencies:** runtime configuration, [persistence](persistence.md), domain services, [site rendering](site.md), and [observability](observability.md).

**Consumers:** browsers, authoring clients, deployment probes, and HTTP tests.

**Invariants:** `/api` precedes static/SPA fallback and unknown API routes return JSON. Missing static files return 404; missing built HTML returns maintenance 503. Admin content routes require `JGANTTS_ADMIN_TOKEN` via bearer or secure, HttpOnly, SameSite-strict session cookie scoped to `/api/admin`; missing configuration disables access. Shutdown stops the worker before closing SQLite.

**Source:** [server](../../../jgantts-server/src/server.ts), [app](../../../jgantts-server/src/app.ts), [configuration](../../../jgantts-server/src/config.ts), [API routers](../../../jgantts-server/src/api), [middleware](../../../jgantts-server/src/middleware).

[Server map](index.md)
