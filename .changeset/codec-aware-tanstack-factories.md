---
'@polygonlabs/example-client': minor
'example-frontend': patch
---

Adopt the codec-aware TanStack Query factories from
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
