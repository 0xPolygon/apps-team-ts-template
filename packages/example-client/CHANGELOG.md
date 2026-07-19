# @polygonlabs/example-client

## 0.6.1

### Patch Changes

- [#63](https://github.com/0xPolygon/apps-team-ts-template/pull/63) [`54c3c82`](https://github.com/0xPolygon/apps-team-ts-template/commit/54c3c82cdb02f951fdf28db484955905089c7eca) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Update `@hey-api/openapi-ts` to 0.97.3 to resolve a reported security advisory, align `@polygonlabs/zod-to-openapi-heyapi` to 2.0.3, and regenerate the client.

  The regenerated fetch runtime restructures request/error handling internally (a single try/catch around the request lifecycle); the client's API surface is unchanged, and the generated output is byte-identical under the updated plugin.

- [#62](https://github.com/0xPolygon/apps-team-ts-template/pull/62) [`90dc551`](https://github.com/0xPolygon/apps-team-ts-template/commit/90dc551650f743fa9ab29084ae52728db6a7c213) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Ship the LICENSE file inside each package directory

  The previous release added the Apache-2.0 license at the repo root and
  declared it in package.json, but npm only auto-includes a LICENSE file
  in the packed tarball when it lives in the same directory as the
  package's own package.json. These packages are all private today, but
  this keeps the pattern correct for any package that publishes later.

- Updated dependencies [[`90dc551`](https://github.com/0xPolygon/apps-team-ts-template/commit/90dc551650f743fa9ab29084ae52728db6a7c213)]:
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

- Updated dependencies [[`bcec096`](https://github.com/0xPolygon/apps-team-ts-template/commit/bcec096723b0875b7696ef63251e3580c9bf8e2b), [`35e35fa`](https://github.com/0xPolygon/apps-team-ts-template/commit/35e35fa75acba3a2658ec96a17b6ff995c7814f7)]:
  - @polygonlabs/example-schemas@1.2.0

## 0.5.0

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

- Updated dependencies [b598714]
  - @polygonlabs/example-schemas@1.1.0

## 0.4.0

### Minor Changes

- cbe1639: Adopt the codec-aware TanStack Query factories from
  `@polygonlabs/zod-to-openapi-heyapi` v1.2's new `tanstackReactQuery: true`
  option (wired via the new `defineRegistryClientConfig` factory). The
  factory installs the upstream `@hey-api/openapi-ts`
  `@tanstack/react-query` plugin alongside the registry plugin, with a
  parser-level `isQuery: false` hook scoped to codec op ids — so codec
  ops get factories from the registry plugin (typed against `${Op}Input`,
  codec slots pre-encoded into the queryKey) and non-codec ops keep the
  standard wire-shape factories from upstream. Same names across both
  emissions, no collisions.

  ```ts
  useQuery(getBlockMetadataOptions({ path: { blockNumber: 23000000n } }));
  ```

  `getBlockMetadataOptions` and other codec-aware factories are now
  exported from `@polygonlabs/example-client/react`, which split-imports
  the codec-ops half from `registry-validator.gen.ts` and the non-codec
  half from `@tanstack/react-query.gen.ts`. Codec slots in the queryKey
  are pre-encoded synchronously (`z.encode(Schema, value)`), so the
  default `JSON.stringify`-based queryKeyHashFn stays stable for `bigint`
  inputs without consumer-side ceremony — the bigint-aware
  `queryKeyHashFn` override on the example-frontend `QueryClient` has
  been removed.

  The codec-test panel uses the canonical factory directly via
  `useQuery({ ...getBlockMetadataOptions(...), enabled: false })` and
  guards `BigInt(blockHeight)` against empty / non-numeric input so an
  invalid value disables the fetch button instead of crashing the
  panel during render.

- 956d94c: Re-export the per-client wrapper-error narrowing surface from the package
  entry: `TransportError`, `UnknownError`, `isTransportError`,
  `isUnknownError`, `isWrapperError`. Consumers can now narrow a typed-client
  result's `error` without reaching into `./generated/*.gen.js`.

  These are the codegen-emitted, per-client guards from
  `@polygonlabs/zod-to-openapi-heyapi` v1.3 (every wrapper return is
  statically widened to `${Op}Error | TransportError | UnknownError`).
  Cross-client / logging-adapter helpers still live at
  `@polygonlabs/zod-to-openapi-heyapi/errors` (`categorizeApiError`,
  `getApiErrorMessage`, structural classes/types) — use the per-client
  guards in component code where the wrapper return type is in scope, and
  the cross-client helper in adapters that route on category without
  caring which operation produced the error.

  ```ts
  import { isTransportError, isUnknownError } from '@polygonlabs/example-client';

  if (isTransportError(error)) {
    /* error.cause is Error — no cast */
  }
  if (isUnknownError(error)) {
    /* error.body is unknown, cause.issues is ZodIssue[] */
  }
  ```

  Also regenerates `src/generated/**` against plugin v1.3 — picks up the
  `WrapErrors<TData, TError, ThrowOnError>` widening on every wrapper
  return type, the `instanceof Error` discrimination in the runtime
  guards, and the `Symbol.for(...)` identity markers on the error
  classes (cross-realm-safe `instanceof` substitute).

### Patch Changes

- 7a5b161: Route the hand-written barrel (`src/index.ts`, `src/react.ts`) entirely
  through `./generated/index.js` — no more deep `*.gen.ts` reaches. With
  `@polygonlabs/zod-to-openapi-heyapi@1.3.0`'s completed auto-barrel
  (`includeInEntry: true` on `@hey-api/client-fetch` and the upstream
  `@tanstack/react-query` plugin, with the colliding `QueryKey` alias
  filtered out), the singleton `client`, every SDK wrapper, the
  wrapper-error classes + guards, and every TanStack Query factory
  (codec-aware and standard) all flow through the auto-generated
  canonical entry. Consumers wiring up a publishable client package
  should treat `./generated/index.js` as the single import target —
  the layout under `./generated/` (which file owns which op, where the
  singleton lives) is an internal codegen concern they shouldn't have
  to know about.
- 95385cf: Adopt the chainable `TypedRegistry` API from `@polygonlabs/openapi-registry` v2 and the `HandlerMapFor` pattern from `@polygonlabs/express` v2.

  ## Breaking changes

  `@polygonlabs/example-schemas` now composes its registry by chaining `registerPath`, `registerSecurityScheme`, and `with(fn)` on a single inferred-return `TypedRegistry`, instead of the earlier statement-form `registry.registerPath(...); registry.extend(fn);` pattern. The exported `Operations` type is now derived via `OperationsOf<typeof buildRegistry>` from `@polygonlabs/openapi-registry` rather than a hand-rolled conditional type.

  Per-domain route helpers under `src/routes/` are now generic over both `Ops` and `Schemes`, take a `TypedRegistry`, chain registrations, and return the chain's final value.

  ## Why

  The new chainable shape removes the function-wrapper-plus-explicit-annotation requirement that the asserts-based API needed for the operation narrow to flow across the export boundary. Consumers can write `export const buildRegistry = () => new TypedRegistry().registerPath(...).with(...)` directly and the inferred return carries the full manifest. `OperationsOf` brands the empty-manifest case as a type-level error, which surfaces the silent failure where every chain return was discarded.

  `example-rest-api` handlers switch from `defineHandlers<Operations, AppAuthMap>()({ ... })` to `({ ... }) satisfies Partial<HandlerMapFor<typeof buildRegistry, AppAuthMap>>`. `HandlerMapFor` reads the registry-builder type directly so handler bags stay in sync with the registry without an intermediate `Operations` import.

  See `apps-team-packages/packages/openapi-registry/MIGRATION.md` for the full migration playbook.

- 725f6ba: Follow `@polygonlabs/zod-to-openapi-heyapi`'s rename of `UnknownError`
  to `ResponseValidationError`. The new name describes the layer the
  failure happened in (response-side validation), symmetric with
  `TransportError` (transport-layer failure) and unambiguous against
  request-side `z.encode` failures the plugin also runs.
  - `packages/example-client` re-exports `ResponseValidationError` and
    `isResponseValidationError` (replacing the old names).
  - `packages/example-frontend`'s `<ApiErrorMessage>` narrows via
    `isResponseValidationError` and tags the rendered alert with
    `data-error-category="response-validation"`.
  - `reportApiError` (Sentry adapter) tags events with
    `api.error.kind: response-validation` and attaches the wire body +
    full `ZodError` under `api.response-validation`. The structural
    `ResponseValidationError.cause` type from the plugin's `/errors`
    subpath is now the full `ZodError`, so `.format()` / `.flatten()` /
    `.issues` are reachable without a cast.

- Updated dependencies [95385cf]
  - @polygonlabs/example-schemas@1.0.0

## 0.3.0

### Minor Changes

- 83b87da: Add a `./factory` subpath export that surfaces hey-api's `createClient` / `createConfig` for advanced setups that need more than the singleton — multiple instances pointing at different base URLs, per-request config in SSR, a custom fetch adapter. Mirrors the pattern shipped by `@polygonlabs/bpn-rest-api` and `@polygonlabs/spol-api-client`.

  ```ts
  import { getBlockNumber } from '@polygonlabs/example-client';
  import { createClient, createConfig } from '@polygonlabs/example-client/factory';

  const myClient = createClient(createConfig({ baseUrl, fetch: customFetch }));
  await getBlockNumber({ client: myClient });
  ```

  The default singleton `client` import remains the recommended path for typical apps.

- 155f133: Migrate `example-client` from orval to `@hey-api/openapi-ts` with the registry-driven `@polygonlabs/zod-to-openapi-heyapi` plugin.

  The generated client now imports the actual `@polygonlabs/example-schemas` Zod schemas the backend uses to validate the wire — instead of regenerating them from the OpenAPI spec — so codecs (`Int64Codec`, `IsoDateCodec`, etc.) round-trip end-to-end. Response transformers run `parseAsync` on every response, so the wire string for `BlockNumberResponse.blockNumber` reaches callers as a `bigint` rather than a `string`.

  `example-schemas` adopts `@polygonlabs/zod-codecs` for `Int64Codec` (replacing the inline `z.number().int()` block-number type) and renames schema exports to match the registered names the plugin requires (`HealthCheckResponse`, `HelloResponse`, `BlockNumberResponse` — `*Schema` suffix dropped). The pre-existing `BlockNumberResponse` / `HealthCheckResponse` / `HelloResponse` type aliases are gone — derive types via `z.output<typeof Schema>` (or `z.infer`) where needed.

  Consumers of `example-client`:
  - Configure the singleton client once at app entry: `client.setConfig({ baseUrl })`. The orval `createExampleClient(baseUrl)` factory and the `createExampleQueryHooks(baseUrl)` factory are gone.
  - Call SDK functions directly: `getBlockNumber()`, `getHealthCheck()`, `getHello()` — each returns `{ data, error, ... }` (hey-api's `responseStyle: 'fields'` shape).
  - React: import options factories from `@polygonlabs/example-client/react` and pass to `useQuery`: `useQuery(getBlockNumberOptions())`.

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

### Patch Changes

- 38291ed: Bump `@polygonlabs/zod-to-openapi-heyapi` to `^1.1.0` (narrowed audit + improved error messages) and drop the explicit `@hey-api/client-fetch` dependency. The fetch client's source is vendored into `@hey-api/openapi-ts`'s output — the explicit dep was unused and tripped a deprecation warning on every `pnpm install`. Generated client output is unchanged.
- Updated dependencies [155f133]
- Updated dependencies [1acf577]
  - @polygonlabs/example-schemas@0.3.0

## 0.2.2

### Patch Changes

- 06b7d1d: Document why `setBaseUrl` strips trailing slashes — the generated paths always start with `/`, so removing any trailing slash from the base avoids double-slashed URLs at concat time regardless of how the caller writes the base URL.

## 0.2.1

### Patch Changes

- 297dc24: Exercise every package bump through the migrated pipelines-backed workflows (CI, npm release, Docker release). No runtime or API change.

## 0.2.0

### Minor Changes

- a2de5fe: Add `example-schemas` and `example-client` packages to implement the three-package monorepo pattern.

  `example-schemas` publishes Zod response schemas, an OpenAPI registry, and a committed `openapi.json`
  spec. `example-client` consumes the spec via orval to generate a typed fetch client and TanStack
  Query hooks. `example-rest-api` now imports schemas from the shared package and its tests assert
  against the typed client. `example-frontend` uses the client's React hooks to display the current
  block number.

  This establishes the template as the canonical reference for the schemas/service/client pattern
  documented in `apps-team-ops/docs/best-practices/backend.md`.
