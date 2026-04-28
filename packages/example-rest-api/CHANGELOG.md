# example-rest-api

## 0.2.4

### Patch Changes

- 06b7d1d: Document the graceful-shutdown pattern: `server.close()` stops accepting new connections and waits for in-flight requests to drain; `process.exit(0)` inside the close callback ensures the process actually terminates even if non-server handles (timers, open sockets) are still keeping the event loop alive.

## 0.2.3

### Patch Changes

- 75855fd: Bump Vitest from 3.2 to 4.1 in both example packages. Vite itself stays on 7.x (Vitest 4 bundles Vite 7 by default), so the `ssr.resolve.conditions` wrapper in `example-rest-api/vitest.config.ts` is still required — Vite's SSR resolver ignores top-level `resolve.conditions` and tests against workspace library packages would otherwise fail to resolve their `@polygonlabs/source` export with no built `dist/`.
- a647088: Harden RPC-failure handling in the template service.
  - `NetworkService.get()` now triggers a fresh on-demand poll when both `state` and `activePoll` are empty, instead of throwing "no data and no active poll" for up to `intervalSecs` after a failed initial poll. Callers always either receive data or the real underlying fetch error.
  - The global error handler sanitises ethers v6 fetch errors before anything reaches the HTTP response body or the log pipeline. The full request URL — including any `?token=<secret>` — was previously present in `err.message`, `err.stack`, and `err.info.requestUrl`; any of the three would have leaked the token to clients or Datadog. `info.requestUrl` is now reduced to the URL origin and the response uses the ethers `shortMessage`. Services built on this template inherit the fix for free.
  - The docker-release trigger's `RPC_URL` now points at a tokenless public Ethereum endpoint (`ethereum-rpc.publicnode.com`) so the integration-test job doesn't depend on a repo-specific secret. Real services override the trigger's `env:` block with their own RPC configuration.

## 0.2.2

### Patch Changes

- 297dc24: Exercise every package bump through the migrated pipelines-backed workflows (CI, npm release, Docker release). No runtime or API change.
- Updated dependencies [297dc24]
  - @polygonlabs/example-schemas@0.2.1

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
