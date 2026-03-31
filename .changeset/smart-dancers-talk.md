---
"example-rest-api": patch
---

Migrate to `@polygonlabs/logger`, `@polygonlabs/verror`, and `@polygonlabs/apps-team-lint` v2; add Sentry integration and structured error handling.

- Logger is created once at startup with `createLogger()` and injected as a dependency. A per-request child logger bound to `req.log` carries a `requestId` for Datadog correlation.
- `@polygonlabs/verror` error hierarchy replaces raw `Error` throws. `HTTPError` drives the global error handler; `NotFound` is used for unknown routes.
- Global error handler logs only server errors (≥500) at `debug` — 4xx are expected client behaviour and produce no log entry. Sentry is notified via the `err` key on `logger.error`.
- `src/instrument.ts` renamed to `src/sentry.ts`. Sentry is initialised before any other module loads.
- `apps-team-lint` upgraded to v2: `commitlint.config.js` uses the `commitlint()` function API; `.markdownlint-cli2.jsonc` replaced with `.markdownlint-cli2.mjs` using `markdownlint()`.
- `src/env.ts` migrated to the lazy `getEnv()` pattern. Adds `PRETTY_LOGS` and `SENTRY_DSN` fields. `dotenvx run --` prefixes the `dev` script for local env loading.
