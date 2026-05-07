// TanStack Query options factories emitted by
// `@polygonlabs/zod-to-openapi-heyapi`'s `tanstackReactQuery: true` option.
// Factories split across two files by codec status:
//
//   - `registry-validator.gen.ts` — codec ops (request input goes through a
//     registered Zod schema). Typed against `${Op}Input` (runtime shapes —
//     `bigint`, `Date`); codec slots pre-encoded into the queryKey.
//   - `@tanstack/react-query.gen.ts` — non-codec ops, emitted by the
//     upstream `@tanstack/react-query` plugin. Standard wire-shape factories
//     typed against `${Op}Data`.
//
// Both halves use the same names (`${opId}Options` / `${opId}QueryKey`), so
// the consumer call site sees one naming scheme. Usage:
//
//   import { getBlockMetadataOptions } from '@polygonlabs/example-client/react';
//   const { data } = useQuery(getBlockMetadataOptions({ path: { blockNumber: 23000000n } }));
//
// Configure the baseUrl once at application entry via the singleton client
// from the main entrypoint:
//
//   import { client } from '@polygonlabs/example-client';
//   client.setConfig({ baseUrl: env.VITE_API_URL });
//
// Codec round-trip: `getBlockMetadataOptions` accepts the runtime shape
// (`bigint` for `Int64Codec`, `Date` for `IsoDateCodec`) and pre-encodes
// codec slots into the queryKey as wire-shape strings. This keeps the
// default `JSON.stringify`-based queryKey hash stable for bigint inputs
// without requiring a custom `queryKeyHashFn` on the consumer's
// QueryClient.
export {
  getBlockNumberOptions,
  getBlockNumberQueryKey,
  getHealthCheckOptions,
  getHealthCheckQueryKey,
  getHelloOptions,
  getHelloQueryKey,
  getMessageOptions,
  getMessageQueryKey
} from './generated/@tanstack/react-query.gen.ts';
export {
  createMessageOptions,
  createMessageQueryKey,
  getBlockMetadataOptions,
  getBlockMetadataQueryKey,
  listMessagesOptions,
  listMessagesQueryKey
} from './generated/registry-validator.gen.ts';
