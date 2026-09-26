# Development and checks

**Responsibility:** run the two npm workspaces locally and validate their contracts.

**Entry points:** root `npm run dev` starts Express and Vite; `dev:app:live`/`dev:live` start the frontend against the live backend. Workspace scripts are the command authority.

**Dependencies:** Node (server requires >=22.14), installed workspace dependencies, and [runtime configuration](../server/http.md). Map generation has separate Python/tool prerequisites.

**Consumers:** developers, AI agents, CI, and release builds.

**Invariants:** Vite uses port 42301 and proxies `/api`, `/media`, feeds, and sitemap; server defaults to 3000. Production Vite builds exclude `PUBLIC`, which is served/packaged separately. Live-backend mode sends requests to production.

**Checks:** frontend `npm test`, `npm run build`, and `npm run test:e2e`; server `npm run check`, `npm run build`, and `npm run smoke:local`. CI runs frontend unit tests, Python orchestration tests (`python3 -m unittest discover -s python -p 'test_*.py'`), and deployment tooling; Playwright runs separately.

**Source:** [root scripts](../../../package.json), [frontend scripts](../../../jgantts-com/package.json), [Vite](../../../jgantts-com/vite.config.ts), [server scripts](../../../jgantts-server/package.json), [CI](../../../.github/workflows/ci.yml), [Playwright config](../../../jgantts-com/playwright.config.ts).

[Operations map](index.md)
