// TanStack Query factories emitted by `@polygonlabs/zod-to-openapi-heyapi`'s
// `tanstackReactQuery: true` option. The plugin emits two flavours of
// factory:
//
//   - **Codec-aware Options/QueryKey** in `registry-validator.gen.ts`,
//     typed against `${Op}Input` (runtime shapes — `bigint`, `Date`),
//     for ops with a registered input schema. The factory pre-encodes
//     codec slots into the queryKey so the default `JSON.stringify`-based
//     queryKey hash stays stable for bigint inputs without requiring a
//     custom `queryKeyHashFn` on the consumer's QueryClient.
//
//   - **Standard wire-shape Options/QueryKey** in `@tanstack/react-query.gen.ts`,
//     typed against `${Op}Data`, for ops without a registered input
//     schema. Plus `${Op}Mutation` factories for mutations.
//
// Both factory files contribute to the auto-barrel at
// `./generated/index.js` (the plugin sets `includeInEntry: true` on
// the upstream tanstack plugin and filters out the colliding `QueryKey`
// alias) so the public re-export below stays a one-liner — no deep
// `*.gen.js` reaches.
//
// Configure the baseUrl once at application entry via the singleton
// client from the main entrypoint:
//
//   import { client } from '@polygonlabs/example-client';
//   client.setConfig({ baseUrl: env.VITE_API_URL });
//
//   import { getBlockMetadataOptions } from '@polygonlabs/example-client/react';
//   const { data } = useQuery(getBlockMetadataOptions({ path: { blockNumber: 23000000n } }));
export {
  createMessageMutation,
  createMessageOptions,
  createMessageQueryKey,
  getBlockMetadataOptions,
  getBlockMetadataQueryKey,
  getBlockNumberOptions,
  getBlockNumberQueryKey,
  getHealthCheckOptions,
  getHealthCheckQueryKey,
  getHelloOptions,
  getHelloQueryKey,
  getMessageOptions,
  getMessageQueryKey,
  listEventsOptions,
  listEventsQueryKey,
  listMessagesOptions,
  listMessagesQueryKey,
  type QueryKey
} from './generated/index.js';
