# @polygonlabs/example-schemas

## 0.3.0

### Minor Changes

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
