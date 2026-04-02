# example-rest-api

## 0.2.1

### Patch Changes

- 04a0ef4: Replace the per-request RPC call on `/api/block-number` with a background polling service.

  `NetworkService<T>` polls the RPC every 5 seconds using a croner job and caches the result
  in memory. The route handler calls `service.get()` which returns the cached value immediately
  if available, or awaits the in-flight initial poll — so the first request never blocks longer
  than one RPC round-trip and subsequent requests are served from cache with no RPC latency.

  `server.ts` now exports `createServer(logger)` instead of `getExpressApp(logger, provider)`,
  internalising provider creation and wiring the NetworkService lifecycle to the http.Server.
  `serverEvents` emits `cronRegistered` after `listen()` so subscribers can capture the cron
  handle. `tests/helpers/agent.ts` and `tests/env.ts` follow the pos-airdrop pattern:
  `getAgent()` returns `{ agent, baseUrl }` with the server started once and reused across
  all tests in the file.

- a2de5fe: Add `example-schemas` and `example-client` packages to implement the three-package monorepo pattern.

  `example-schemas` publishes Zod response schemas, an OpenAPI registry, and a committed `openapi.json`
  spec. `example-client` consumes the spec via orval to generate a typed fetch client and TanStack
  Query hooks. `example-rest-api` now imports schemas from the shared package and its tests assert
  against the typed client. `example-frontend` uses the client's React hooks to display the current
  block number.

  This establishes the template as the canonical reference for the schemas/service/client pattern
  documented in `apps-team-ops/docs/best-practices/backend.md`.

- Updated dependencies [a2de5fe]
  - @polygonlabs/example-schemas@0.2.0

## 0.2.0

### Minor Changes

- b0bb16e: Add `/api/block-number` endpoint demonstrating the correct ethers v6 provider pattern; introduce `RpcUrlSchema` for RPC URL env validation.

  The endpoint returns the latest block number from the configured RPC. It demonstrates how to create and inject a provider at startup — never inside a request handler or retry loop — using `staticNetwork` to skip `eth_chainId` detection and avoid accumulating kernel socket buffers under load.

  `RpcUrlSchema` validates `RPC_URL` at startup using `superRefine`. Error messages include the URL origin only, never the full URL (which may contain secret tokens in query parameters). `rpc.polygon.tools` is explicitly required to use `https://` because the host redirects `http://` with a 301 that ethers never follows, silently making the RPC appear unreachable.

  New env vars: `RPC_URL` (required), `RPC_CHAIN_ID` (required).

- 0062949: Add `parseRpcUrlArray` helper for services that need multiple RPC endpoints with retry/failover.

  `parseRpcUrlArray` parses a JSON-encoded string array and validates each element with `RpcUrlSchema`. Use it as a `.transform()` callback for env vars that hold multiple RPC endpoints. The optional `RPC_URLS` env var in the example schema demonstrates the pattern.

### Patch Changes

- 06f6056: Migrate to `@polygonlabs/logger`, `@polygonlabs/verror`, and `@polygonlabs/apps-team-lint` v2; add Sentry integration and structured error handling.
  - Logger is created once at startup with `createLogger()` and injected as a dependency. A per-request child logger bound to `req.log` carries a `requestId` for Datadog correlation.
  - `@polygonlabs/verror` error hierarchy replaces raw `Error` throws. `HTTPError` drives the global error handler; `NotFound` is used for unknown routes.
  - Global error handler logs only server errors (≥500) at `debug` — 4xx are expected client behaviour and produce no log entry. Sentry is notified via the `err` key on `logger.error`.
  - `src/instrument.ts` renamed to `src/sentry.ts`. Sentry is initialised before any other module loads.
  - `apps-team-lint` upgraded to v2: `commitlint.config.js` uses the `commitlint()` function API; `.markdownlint-cli2.jsonc` replaced with `.markdownlint-cli2.mjs` using `markdownlint()`.
  - `src/env.ts` migrated to the lazy `getEnv()` pattern. Adds `PRETTY_LOGS` and `SENTRY_DSN` fields. `dotenvx run --` prefixes the `dev` script for local env loading.

## 0.1.2

### Patch Changes

- bb84f54: Upgrade express from v4 to v5

## 0.1.1

### Patch Changes

- 7fe2216: Testing docker deployment pipeline

## 0.1.0

### Minor Changes

- ddc8dbd: Add full release pipeline infrastructure: changesets versioning, OIDC npm publishing via trusted publisher, and Docker release workflow using a generic two-stage pnpm deploy Dockerfile.

### Patch Changes

- 1362a32: Support `TEST_BASE_URL` environment variable in integration tests so the
  same suite can run against both the local Express app and a deployed Docker
  container.
- 1362a32: Set `link-workspace-packages=false` and `bumpVersionsWithWorkspaceProtocolOnly: false`
  to ensure Docker builds at a release tag install workspace library dependencies
  (schemas, client) from the npm registry rather than local workspace source.
