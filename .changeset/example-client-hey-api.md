---
'@polygonlabs/example-client': minor
'@polygonlabs/example-schemas': minor
---

Migrate `example-client` from orval to `@hey-api/openapi-ts` with the registry-driven `@polygonlabs/zod-to-openapi-heyapi` plugin.

The generated client now imports the actual `@polygonlabs/example-schemas` Zod schemas the backend uses to validate the wire — instead of regenerating them from the OpenAPI spec — so codecs (`Int64Codec`, `IsoDateCodec`, etc.) round-trip end-to-end. Response transformers run `parseAsync` on every response, so the wire string for `BlockNumberResponse.blockNumber` reaches callers as a `bigint` rather than a `string`.

`example-schemas` adopts `@polygonlabs/zod-codecs` for `Int64Codec` (replacing the inline `z.number().int()` block-number type) and renames schema exports to match the registered names the plugin requires (`HealthCheckResponse`, `HelloResponse`, `BlockNumberResponse` — `*Schema` suffix dropped). The pre-existing `BlockNumberResponse` / `HealthCheckResponse` / `HelloResponse` type aliases are gone — derive types via `z.output<typeof Schema>` (or `z.infer`) where needed.

Consumers of `example-client`:

- Configure the singleton client once at app entry: `client.setConfig({ baseUrl })`. The orval `createExampleClient(baseUrl)` factory and the `createExampleQueryHooks(baseUrl)` factory are gone.
- Call SDK functions directly: `getBlockNumber()`, `getHealthCheck()`, `getHello()` — each returns `{ data, error, ... }` (hey-api's `responseStyle: 'fields'` shape).
- React: import options factories from `@polygonlabs/example-client/react` and pass to `useQuery`: `useQuery(getBlockNumberOptions())`.
