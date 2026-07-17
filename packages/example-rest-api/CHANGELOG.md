# example-rest-api

## 0.6.1

### Patch Changes

- [#62](https://github.com/0xPolygon/apps-team-ts-template/pull/62) [`90dc551`](https://github.com/0xPolygon/apps-team-ts-template/commit/90dc551650f743fa9ab29084ae52728db6a7c213) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Ship the LICENSE file inside each package directory

  The previous release added the Apache-2.0 license at the repo root and
  declared it in package.json, but npm only auto-includes a LICENSE file
  in the packed tarball when it lives in the same directory as the
  package's own package.json. These packages are all private today, but
  this keeps the pattern correct for any package that publishes later.

- [#63](https://github.com/0xPolygon/apps-team-ts-template/pull/63) [`357ff03`](https://github.com/0xPolygon/apps-team-ts-template/commit/357ff03103e48718f5883ae34781581db85ed4b4) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Update dependencies to resolve reported security advisories.

  The REST API's auth tests now account for `@polygonlabs/express` 4.1 running request validation before auth handlers — a malformed request to a protected route returns 400 (validation error) instead of 401. See that package's MIGRATION.md.

- Updated dependencies [[`90dc551`](https://github.com/0xPolygon/apps-team-ts-template/commit/90dc551650f743fa9ab29084ae52728db6a7c213)]:
  - @polygonlabs/example-db@0.2.1
  - @polygonlabs/example-schemas@1.2.1

## 0.6.0

### Minor Changes

- [#55](https://github.com/0xPolygon/apps-team-ts-template/pull/55) [`35e35fa`](https://github.com/0xPolygon/apps-team-ts-template/commit/35e35fa75acba3a2658ec96a17b6ff995c7814f7) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Add an indexer → shared-db → REST-API showcase built on the new canonical
  `@polygonlabs/viem-event-watcher` package.

  ## What's new
  - **`example-db`** — a Firestore-backed library exposing an `EventStore` of
    decoded on-chain events and a per-chain `CursorStore`. Zod schemas are the
    source of truth, applied as a Firestore converter so every read is validated
    at the boundary.
  - **`example-indexer`** — a deployable service that drives
    `@polygonlabs/viem-event-watcher`'s `streamEvents` to consume a contract's
    logs and persist them to `example-db`, advancing the cursor to each scanned
    batch's high-water-mark. It owns the cursor, restart loop, and logging; the
    watcher uses `eth_getLogs` polling (not `watchEvent`) so log delivery is
    reliable on Polygon bor.
  - **`example-e2e`** — an end-to-end suite that deploys a minimal event-emitter
    contract to a live kurtosis-pos bor devnet, emits events, runs the indexer,
    and asserts they land in `example-db` with the cursor advanced.

  ## Changed
  - **`example-rest-api`** gains `GET /events`, serving the indexed events back
    out of `example-db` with optional filters and opaque-cursor pagination.
  - **`example-schemas`** / **`example-client`** add the `IndexedEvent` /
    `EventList` schemas and the `listEvents` operation (spec + generated client
    regenerated).
  - **`example-rest-api`** now follows the four-layer test doctrine: unit and
    service-integration tests run together under the one `vitest.config.ts`
    (which owns the Firestore-emulator + Redis `globalSetup`), so `pnpm test`
    runs both on every PR. The separate `vitest.integration.config.ts`, the
    `tests/integration/` directory, and the `test:integration` /
    `test:*-integration` scripts are removed — the prior split was the
    antipattern the doctrine replaces. The config now excludes
    `tests/prod-smoke/**` so a bare `pnpm test` can never reach a deployed
    instance.
  - **`example-rest-api`** gains the fourth test tier — a **prod-smoke** suite
    (`tests/prod-smoke/*.prod-smoke.test.ts` + `vitest.prod-smoke.config.ts`)
    that hits a deployed instance over HTTPS and validates each response against
    the route's own Zod schema (`HealthCheckResponse`, `EventList`). It runs only
    via the new `test:prod-smoke` / `test:dev-smoke` scripts, never in CI, and
    skips cleanly when the target URL is unset — so the template now demonstrates
    all four test tiers (unit, service-integration, e2e, prod-smoke).

### Patch Changes

- [#60](https://github.com/0xPolygon/apps-team-ts-template/pull/60) [`bcec096`](https://github.com/0xPolygon/apps-team-ts-template/commit/bcec096723b0875b7696ef63251e3580c9bf8e2b) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Add Apache-2.0 license

  The repository now ships an Apache License 2.0 `LICENSE` file at the root, and every package declares `"license": "Apache-2.0"` in its `package.json`.

- [#59](https://github.com/0xPolygon/apps-team-ts-template/pull/59) [`1b381de`](https://github.com/0xPolygon/apps-team-ts-template/commit/1b381de21a23a017d8834368c245f189ddf790a6) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Fix the test suite so it passes against a deployed container (`TEST_BASE_URL` mode), unbreaking the Docker release test gate.
  - Auth-gated requests now authenticate with the `MANAGEMENT_API_KEY` the server under test was actually started with: the tests read the key from the environment instead of hardcoding the committed `.env.test` placeholder, and the vitest global setup preserves an externally injected value over that placeholder.
  - Chain-coupled assertions no longer assume the in-process stub fetchers: against a live RPC the block-number check asserts the codec decode rather than an exact height, the codec round-trip uses a well-finalised mainnet block, and the not-found case asks for a far-future height instead of block 0 (which exists on a real chain).

- Updated dependencies [[`bcec096`](https://github.com/0xPolygon/apps-team-ts-template/commit/bcec096723b0875b7696ef63251e3580c9bf8e2b), [`35e35fa`](https://github.com/0xPolygon/apps-team-ts-template/commit/35e35fa75acba3a2658ec96a17b6ff995c7814f7)]:
  - @polygonlabs/example-db@0.2.0
  - @polygonlabs/example-schemas@1.2.0

## 0.5.0

### Minor Changes

- [#52](https://github.com/0xPolygon/apps-team-ts-template/pull/52) [`606a2b5`](https://github.com/0xPolygon/apps-team-ts-template/commit/606a2b56ed9d38bb86b79a3af6708037709ff0b2) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Adopt @polygonlabs/express 4.0.0 + @polygonlabs/logger 3.0.0 in the reference service, and scope every workspace package under @polygonlabs/.

  ## @polygonlabs/example-rest-api
  - `@polygonlabs/express` ^3.0.0 → ^4.0.0, `@polygonlabs/logger` ^2.1.0 → ^3.0.0, `@polygonlabs/verror` ^1.0.4 → ^1.1.0. No code changes were required: the v4/v3 majors move RPC fetch-error sanitisation into `@polygonlabs/verror`'s `serializeError` / `VError.toJSON` (adding viem coverage) and rename the internal `sanitiseEthersFetchError` export to `sanitiseRpcFetchError` — none of which this service touches directly.
  - Package renamed `example-rest-api` → `@polygonlabs/example-rest-api`. The Docker image name is unchanged (the shared docker-test composite strips the scope), and the changeset git tag is now `@polygonlabs/example-rest-api@x.y.z` — the docker-release trigger's generic tag patterns already match scoped tags, so no workflow change is required.

  ## @polygonlabs/example-frontend
  - Package renamed `example-frontend` → `@polygonlabs/example-frontend` (all-packages-scoped policy; no behaviour change).

## 0.4.0

### Minor Changes

- b598714: Add a canonical "managed local resource" integration-test example: a cache-aside widget read path where Firestore is the source of truth and Redis is a lookaside cache in front of it.

  ## What's new
  - `GET /api/widgets/{id}` — registry-driven route returning a `Widget`, served via the codegen client. The handler delegates to a `WidgetService` doing cache-aside (Redis hit → return; miss → Firestore → populate cache), and throws `NotFound` for an unknown id.
  - `src/redis.ts` (single-node ioredis, `enableOfflineQueue: false`, `host:port` parse) and `src/firestore.ts` (emulator-aware client). Both clients are built lazily on first widget request so the hermetic unit suite never connects.
  - New env: `REDIS_URL`, `REDIS_CLUSTER`, `FIRESTORE_EMULATOR_HOST`, `GOOGLE_CLOUD_PROJECT_ID` (validated in `src/env.ts`).

  ## The point — one globalSetup owns BOTH resources

  `vitest.globalSetup.ts` stands up a Firestore emulator AND Redis from one place and shows both discovery styles: Redis via an explicit `REDIS_URL`, Firestore via the SDK-detected `FIRESTORE_EMULATOR_HOST`. Both publish on EPHEMERAL host ports (discovered with `docker compose port`) so concurrent suites never collide on a fixed port. A single gate decides whether to manage Docker, defer to externally-provided resources (CI), or skip for a URL target. Firestore state is cleared per-test (`beforeEach`) for order-independence; the cache isn't, illustrating the stateful-store-vs-cache distinction.

  Split configs: `vitest.config.ts` stays hermetic (excludes `tests/integration/**`); `vitest.integration.config.ts` carries the globalSetup; `test = test:unit && test:integration`. `.env.test` is committed and non-secret — the `demo-*` Firestore project and Redis need no credentials, so a fresh clone runs `pnpm test` with no setup.

  The `@polygonlabs/example-schemas` and `@polygonlabs/example-client` packages gain the `Widget` schema and the generated `getWidget` client.

### Patch Changes

- ab36b5e: Make the example handlers emit 404s the team-standard way — throw `NotFound` from `@polygonlabs/verror` instead of writing `res.status(404).json(...)` by hand.

  `getMessage` and `getBlockMetadata` previously hand-rolled the 404 body; the global `createErrorHandler` from `@polygonlabs/express` already maps an `HTTPError`'s `statusCode` and emits the canonical `ErrorResponse` shape, so throwing keeps the served spec, the runtime body, and the typed client in agreement without per-handler status wiring. This matches the auth handler (which already throws `NotAuthenticated`) and the new widget handler. No response-shape change for clients — the body is still `{ error: true, message }`.

- Updated dependencies [b598714]
  - @polygonlabs/example-schemas@1.1.0

## 0.3.0

### Minor Changes

- 95385cf: Adopt the chainable `TypedRegistry` API from `@polygonlabs/openapi-registry` v2 and the `HandlerMapFor` pattern from `@polygonlabs/express` v2.

  ## Breaking changes

  `@polygonlabs/example-schemas` now composes its registry by chaining `registerPath`, `registerSecurityScheme`, and `with(fn)` on a single inferred-return `TypedRegistry`, instead of the earlier statement-form `registry.registerPath(...); registry.extend(fn);` pattern. The exported `Operations` type is now derived via `OperationsOf<typeof buildRegistry>` from `@polygonlabs/openapi-registry` rather than a hand-rolled conditional type.

  Per-domain route helpers under `src/routes/` are now generic over both `Ops` and `Schemes`, take a `TypedRegistry`, chain registrations, and return the chain's final value.

  ## Why

  The new chainable shape removes the function-wrapper-plus-explicit-annotation requirement that the asserts-based API needed for the operation narrow to flow across the export boundary. Consumers can write `export const buildRegistry = () => new TypedRegistry().registerPath(...).with(...)` directly and the inferred return carries the full manifest. `OperationsOf` brands the empty-manifest case as a type-level error, which surfaces the silent failure where every chain return was discarded.

  `example-rest-api` handlers switch from `defineHandlers<Operations, AppAuthMap>()({ ... })` to `({ ... }) satisfies Partial<HandlerMapFor<typeof buildRegistry, AppAuthMap>>`. `HandlerMapFor` reads the registry-builder type directly so handler bags stay in sync with the registry without an intermediate `Operations` import.

  See `apps-team-packages/packages/openapi-registry/MIGRATION.md` for the full migration playbook.

### Patch Changes

- c546183: Stop the example Express service from calling `process.exit(0)` in its SIGINT/SIGTERM handler. The force-exit was aborting in-flight Sentry transport sends and async stdout writes — meaning the last error reports and log lines just before shutdown were being silently dropped on rolling deploys. The handler now sets `process.exitCode = 0` and lets the event loop drain naturally, which is the pattern Node's docs recommend.

  This matters because every apps-team service copies its graceful-shutdown block from this template. Downstream services (e.g. `staker-pool-allocations`) carry the same bug and will mirror this fix in follow-up PRs.

- Updated dependencies [95385cf]
  - @polygonlabs/example-schemas@1.0.0

## 0.2.5

### Patch Changes

- 155f133: Switch the integration tests and the block-number hook to the hey-api SDK shape: SDK functions return `{ data, error, ... }`; the singleton client is configured once via `client.setConfig({ baseUrl })` at app entry. The block-number wire field is now an `Int64Codec` digit string that the generated transformer decodes to `bigint` — callers receive `data.blockNumber: bigint`.
- 24048ae: Adopt `@polygonlabs/express` for request-scoped logging, the global error
  handler, and the 404 handler. Bump `@polygonlabs/logger` to v2 and
  `@polygonlabs/verror` to v1.0.3 alongside.

  The previous `src/errors.ts` (ethers fetch-error sanitiser + Express error
  middleware) and the `req.log` augmentation in `src/server.ts` are deleted —
  both are now provided by `@polygonlabs/express`. Routes call `getLogger()`
  in place of `req.log`. The `setupLogger(logger)` middleware mounts before
  any route and primes the out-of-request fallback for `getLogger()` in one
  call. The `declare module 'express-serve-static-core'` augmentation and the
  `@types/express-serve-static-core` devDep are gone.

  The error-sanitisation integration test was tightened to assert what the
  template actually guarantees end-to-end (URL-stripped response message, no
  token in the body) rather than the exact ethers `shortMessage` text — the
  shape of the error message is implementation-detail of the package that now
  owns the sanitisation, not of the template.

- 1acf577: Adopt the registry-driven service architecture from
  `@polygonlabs/openapi-registry` and `@polygonlabs/express`.

  The same `TypedRegistry` instance now feeds the served OpenAPI spec, the
  runtime Express router, and the codegen'd client — there is no parallel
  "register routes here, also list them in the OpenAPI doc" duplication
  anymore. Operation handlers are bound exhaustively at compile time;
  `security: [{ ApiKeyAuth: [] }]` declarations on a route route through
  declarative `.auth(...)` handlers that run before request validation.

  ## Schemas (`@polygonlabs/example-schemas`)
  - Drop the locally-vendored `TypedRegistry` class; depend on
    `@polygonlabs/openapi-registry@^1.1.0` instead. The class is a drop-in
    superset of `OpenAPIRegistry` and accumulates operations + security
    schemes into the registry's type so downstream consumers (the Express
    router, the codegen plugin) see the literal-typed manifest without a
    separate declaration.
  - Split routes into per-domain helpers under `src/routes/`:
    `addCoreRoutes`, `addBlockRoutes`, `addMessageRoutes`. `buildRegistry()`
    composes them via `registry.extend(addX)`.
  - New schemas: `Message`, `MessageList`, `CreateMessageRequest`,
    `BlockMetadata`, `BlockNumberPathParams`, `RecentMessagesQuery`. The
    last two are raw exports (no `.openapi('Name')` chain) so the
    zod-to-openapi-heyapi plugin's identity-based input lookup picks them
    up at codegen time.
  - `BlockNumberPathParams.blockNumber` and `RecentMessagesQuery.since`
    are the codec-input stress tests: a path param whose runtime shape is
    `bigint` (Int64Codec) and a query param whose runtime shape is `Date`
    (IsoDateCodec).
  - Register an `ApiKeyAuth` security scheme; `getBlockMetadata` declares
    `security: [{ ApiKeyAuth: [] }]`.
  - Re-export the canonical `ErrorResponseSchema` from
    `@polygonlabs/openapi-registry/error-schemas` as `ErrorResponse`. The
    alias is required because the schema is registered under
    `.openapi('ErrorResponse', …)` and the codegen plugin's audit checks
    the binding name matches the registered name.

  ## Client (`@polygonlabs/example-client`)
  - Bump `@polygonlabs/zod-to-openapi-heyapi` to `^1.1.1` for codec-input
    encoding (the input transformer runs `z.encode` before the wire is
    built — so `getBlockMetadata({ path: { blockNumber: 123n } })` and
    `listMessages({ query: { since: new Date(...) } })` both round-trip
    end-to-end).
  - `openapi-ts.config.ts`: drop the `getRefId` option (now identity-based
    inside the plugin) and pass `transformer: true` +
    `includeInEntry: false` on `@hey-api/sdk` so the plugin's wrappers
    replace the auto-emitted barrel exports without collision.
  - `src/index.ts`: re-export the codec-aware SDK functions from
    `./generated/registry-validator.gen.ts` (the pass-through wrappers for
    ops without input codecs come from `./generated/sdk.gen.ts` for
    zero-overhead).
  - Regenerated client reflects all of the above.

  ## Service (`example-rest-api`)
  - Bump to `@polygonlabs/express@^1.1.1` and add
    `@polygonlabs/openapi-registry@^1.1.0`. Replace the imperative
    `Router()` setup with `createRegistryRouter({ registry })` from
    `@polygonlabs/express/registry`. The router materialises every route
    in the typed `Operations` manifest exhaustively — a missing handler
    is a TypeScript error at the wiring site, not a 404 at request time.
  - Per-domain handler bags via `defineHandlers<Operations, AppAuthMap>()`
    under `src/handlers/`: `static.ts`, `network.ts`, `messages.ts`, plus
    the `auth.ts` factory that returns the `ApiKeyAuth` handler. Handlers
    call `getLogger()` from `@polygonlabs/express` instead of threading
    `req.log`.
  - New `MessageStore` service (in-memory cursor-paginated store) backs
    the message routes.
  - `MANAGEMENT_API_KEY` env var validates a non-empty string at startup;
    a request to an `ApiKeyAuth`-gated route without the matching
    `x-api-key` header returns 401 before the request validator runs.
  - Tests updated to send the API-key header on auth-gated calls and to
    assert against the registry validator's error shape
    (`info.body.properties.<field>.errors` from `z.treeifyError`). The
    obsolete local `error-sanitisation.test.ts` is removed; the
    team-standard `createErrorHandler` from `@polygonlabs/express` covers
    that surface.
  - The previous `routes/index.ts` and `errors.ts` are deleted — both
    responsibilities now live in `@polygonlabs/express` and the registry.

  ## CI
  - `MANAGEMENT_API_KEY` flows through the docker-release-trigger so the
    integration-test container has the value the in-process auth handler
    expects. CI uses a throwaway placeholder; production deployments
    inject a real secret via External Secrets Operator.

- Updated dependencies [155f133]
- Updated dependencies [1acf577]
  - @polygonlabs/example-schemas@0.3.0

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
