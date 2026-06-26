import { z } from 'zod';

import { Int64Codec, IsoDateCodec } from '@polygonlabs/zod-codecs';
import { extendZodAndCodecsWithOpenApi } from '@polygonlabs/zod-codecs/openapi';

// Called here so this file is self-contained — any direct import triggers
// the extension before schemas are accessed. Drop-in for `extendZodWithOpenApi`
// from `@asteasolutions/zod-to-openapi` that also patches `ZodCodec.prototype`,
// so `.openapi(...)` works on codecs the same way it works on regular schemas
// (in zod v4, `ZodCodec` is a sibling of `ZodType`, not a subclass — the
// upstream patch never reaches codecs).
extendZodAndCodecsWithOpenApi(z);

// Export name === registry name. The @polygonlabs/zod-to-openapi-heyapi
// plugin emits `import { <registeredName> } from '<schemasFrom>'` and audits
// at codegen time that each registered name resolves to a Zod schema export
// of the same name; renaming the export breaks the generated client.

export const HealthCheckResponse = z
  .object({
    success: z.boolean()
  })
  .openapi('HealthCheckResponse');

export const HelloResponse = z
  .object({
    message: z.string()
  })
  .openapi('HelloResponse');

// `blockNumber` uses Int64Codec to demonstrate the codec pattern: wire format
// is a string (JSON has no native int64), runtime is `bigint`. The generated
// client's response transformer decodes the string into a bigint before it
// reaches the caller, so consumers see the type the codec promises.
//
// `.openapi(...)` chains directly onto codecs (via `extendZodAndCodecsWithOpenApi`
// — see top of file) just like any other Zod schema, so per-field description
// metadata can live where you'd naturally write it.
export const BlockNumberResponse = z
  .object({
    blockNumber: Int64Codec.openapi({ description: 'Block height — fits in int64.' })
  })
  .openapi('BlockNumberResponse', {
    description: 'Latest block number from the configured RPC endpoint'
  });

// Block metadata — the codec-on-path-param stress test. The path parameter
// `:blockNumber` uses Int64Codec (see operations.ts), and the response carries
// multiple Int64Codec fields. End-to-end this proves: the typed client accepts
// `bigint` for the path arg, default URL serialisation matches the codec's
// encode (digit-string), the server validates `req.params.blockNumber` against
// Int64Codec to produce a real `bigint` for the handler, and the response
// codecs round-trip back to `bigint` on the client. See INVESTIGATION-codecs.md
// for why this works without plugin extension for number-flavoured codecs.
export const BlockMetadata = z
  .object({
    number: Int64Codec,
    hash: z.string(),
    parentHash: z.string(),
    timestamp: Int64Codec
  })
  .openapi('BlockMetadata', {
    description: 'Block header metadata for a specific height'
  });

// Messages — minimal CRUD surface to exercise body, query, and UUID path
// inputs. UUIDs keep path-param typing trivially symmetric on both sides
// (string in, string out, no codec). Codec coverage on this surface is the
// response-side `createdAt: IsoDateCodec` only — the client receives a real
// `Date` instance via the existing response-transformer pipeline.

export const Message = z
  .object({
    id: z.uuid(),
    text: z.string().min(1),
    createdAt: IsoDateCodec
  })
  .openapi('Message');

export const MessageList = z
  .object({
    items: z.array(Message),
    nextCursor: z.string().nullable()
  })
  .openapi('MessageList');

export const CreateMessageRequest = z
  .object({
    text: z.string().min(1).max(280)
  })
  .openapi('CreateMessageRequest');

// Widget — the cache-aside example's domain entity. Deliberately a plain
// `{ id, name }` with no codec: the managed-local-resource example
// (Firestore source-of-truth + Redis cache, see the service package's
// tests/integration suite) teaches resource lifecycle and test isolation,
// not codec round-tripping — that lesson already lives on Message/Block.
// Keeping the shape trivial keeps the cache-aside read path the only thing
// under test.
export const Widget = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120)
  })
  .openapi('Widget');

// Indexed event — the read side of the indexer→db→REST showcase. This is the
// API projection (camelCase) of the storage-facing `IndexedEvent` that
// `example-indexer` writes to `example-db` (snake_case); the rest-api's
// EventQueryService maps between the two at the boundary. Deliberately
// codec-free: the lesson here is the cross-service data flow, not codec
// round-tripping (that already lives on Message/Block).
export const IndexedEvent = z
  .object({
    id: z.string(),
    chain: z.number().int(),
    contractAddress: z.string(),
    eventName: z.string(),
    blockNumber: z.number().int(),
    transactionIndex: z.number().int().optional(),
    txHash: z.string(),
    logIndex: z.number().int(),
    args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    indexedAt: z.number().int()
  })
  .openapi('IndexedEvent');

export const EventList = z
  .object({
    items: z.array(IndexedEvent),
    // Opaque pagination token; pass back as `cursor` for the next page.
    nextCursor: z.string().nullable()
  })
  .openapi('EventList');

// Query for GET /events. All filters optional. `chain` and `limit` arrive as
// URL strings, so they're coerced; the registry-driven validator runs this
// schema against `req.query` before the handler sees it.
export const ListEventsQuery = z
  .object({
    chain: z.coerce.number().int().optional(),
    contractAddress: z.string().optional(),
    eventName: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
  .openapi('ListEventsQuery');

// Error response shapes are not hand-rolled here. The registry-driven
// router in `@polygonlabs/express` auto-injects the canonical
// `ErrorResponse` (for 401/5xx) and `ValidationErrorResponse` (for 400)
// shapes into every route's `responses` based on what the route
// declares — so the served spec, the runtime body, and the generated
// client agree without per-route boilerplate. See
// `@polygonlabs/openapi-registry`'s `inferStandardErrorResponses`.
// Handler-emitted statuses (404 from `NotFound` throws, 403 from
// authz checks, etc.) declare `ErrorResponse` explicitly at the route.

// ── Input schemas (request side) ──────────────────────────────────────────────
//
// Codec-bearing input schemas must be registered with `.openapi('Name')`
// and exported under that exact name. Since 2.0.0 the
// @polygonlabs/zod-to-openapi-heyapi plugin resolves input slot names
// from this registration metadata (never by module-instance identity,
// which broke under split module evaluation) and fails codegen loudly
// for a codec-bearing slot that isn't registered. Codec-free inline
// request schemas may stay anonymous.

// Codec-on-path stress test: `:blockNumber` is `Int64Codec`. The wire
// shape is a digit string; the runtime shape is `bigint`. With the
// plugin's input transformer in play, callers pass a `bigint` and the
// URL gets the digit string. Number-flavoured codecs round-trip even
// without the transformer (see INVESTIGATION-codecs.md), so this route
// is the ergonomic-typing test case rather than the runtime-fix case.
export const BlockNumberPathParams = z
  .object({
    blockNumber: Int64Codec
  })
  .openapi('BlockNumberPathParams');

// Codec on a query parameter — the case the input transformer is built for.
// `IsoDateCodec.encode = (d) => d.toISOString()` does not equal `String(d)`,
// so without the transformer a Date in `since` would land in the URL as the
// locale string and the server's parser would reject it.
export const RecentMessagesQuery = z
  .object({
    cursor: z.string().optional(),
    since: IsoDateCodec.optional()
  })
  .openapi('RecentMessagesQuery');
