/**
 * Block-related routes — polled latest block number and the codec-on-path
 * stress test (`Int64Codec` on `:blockNumber`).
 */

import type { RouteWithOpId, TypedRegistry } from '@polygonlabs/openapi-registry';

// Renamed to match the OpenAPI registered name (`ErrorResponse`) — the
// codegen plugin emits imports keyed off that, not the upstream binding
// name. Re-exported under the same alias from the package barrel.
import { ErrorResponseSchema as ErrorResponse } from '@polygonlabs/openapi-registry/error-schemas';

import { BlockMetadata, BlockNumberPathParams, BlockNumberResponse, NotFound } from '../schemas.ts';

/**
 * Generic over the parent's `Ops` and `Schemes` so this helper preserves
 * everything `.with(addBlockRoutes)` was called on. Each `.registerPath`
 * narrows the chain; the final return carries the cumulative narrow back
 * out to whatever the outer `.with(...)` is composing into.
 */
export const addBlockRoutes = <
  Ops extends Record<string, RouteWithOpId>,
  Schemes extends Record<string, true>
>(
  r: TypedRegistry<Ops, Schemes>
) =>
  r
    .registerPath({
      operationId: 'getBlockNumber',
      method: 'get',
      path: '/api/block-number',
      summary: 'Current block number',
      description: 'Returns the latest block number from the configured RPC endpoint.',
      responses: {
        200: {
          description: 'Latest block number',
          content: { 'application/json': { schema: BlockNumberResponse } }
        }
      }
    })
    // Codec-on-path-param stress test: `:blockNumber` is `Int64Codec`. The
    // wire shape is a digit string; the runtime shape on both client and
    // server is `bigint`. The input schema (`BlockNumberPathParams`) is
    // registered with a refId so the @polygonlabs/zod-to-openapi-heyapi
    // plugin can emit a runtime-shaped `${Op}Input` type and an input
    // transformer that runs `z.encode(BlockNumberPathParams, value)` —
    // callers pass `bigint` and get a digit string in the URL.
    //
    // Also gated by ApiKeyAuth — exercises the registry router's auth
    // flow. Without a valid x-api-key header the request fails with 401
    // BEFORE the path codec runs, so the response validator never sees a
    // decoded bigint.
    .registerPath({
      operationId: 'getBlockMetadata',
      method: 'get',
      path: '/api/blocks/{blockNumber}',
      summary: 'Block metadata by height',
      description: 'Looks up a block by its height via RPC and returns header metadata.',
      security: [{ ApiKeyAuth: [] }],
      request: {
        params: BlockNumberPathParams
      },
      responses: {
        200: {
          description: 'Block metadata',
          content: { 'application/json': { schema: BlockMetadata } }
        },
        401: {
          description: 'Missing or invalid x-api-key header',
          content: { 'application/json': { schema: ErrorResponse } }
        },
        404: {
          description: 'Block not found',
          content: { 'application/json': { schema: NotFound } }
        }
      }
    });
