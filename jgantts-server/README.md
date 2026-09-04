# JGantts server

The Express application is written in TypeScript under `src/`. Production runs the compiled
`dist/server.js`; `serve.js` remains only as a compatibility launcher for the existing systemd unit.

## Commands

- `npm run dev` — run the TypeScript server in watch mode.
- `npm run check` — type-check and run the HTTP test suite.
- `npm run build` — compile the production server.
- `npm run smoke:local` — build and smoke-test a temporary localhost server.
- `npm run smoke:live` — smoke-test `https://jgantts.com`.
- `npm run smoke` — test localhost and the live server.

The smoke test verifies health, the homepage, server-rendered Holmes metadata, JSON API 404s,
full build metadata, and missing-static-file handling. It retries health checks so it can safely
run immediately after a deployment restart.

## Adding API routes

Add future endpoints to `src/api/router.ts`. Everything mounted below `/api` returns JSON and is
kept ahead of the static-site and SPA fallback middleware.

`GET /api/build` returns the full deployed commit ID and commit message. The build writes these
values to the centralized `dist/build-info.json`, so production does not need access to the Git
repository. The endpoint reads that file on every request, allowing the deployment workflow to
update build information for every `prod` commit without rebuilding or restarting the server.
During local development, the API returns `dev` and `Local development build`, making the badge
state predictable while debugging. Vite proxies `/api` requests to the server on port 3000.
