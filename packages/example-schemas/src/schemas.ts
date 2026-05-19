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
// Plain exports — no `.openapi('Name')` chain needed. The
// @polygonlabs/zod-to-openapi-heyapi plugin resolves input slot names
// by identity-matching the route's `request.{params, query, body}`
// schema against the named exports of `schemasFrom` at codegen time.
// Use the same instance in the route as you export here (i.e. import
// and pass it directly), and the plugin emits the matching import +
// input transformer.

// Codec-on-path stress test: `:blockNumber` is `Int64Codec`. The wire
// shape is a digit string; the runtime shape is `bigint`. With the
// plugin's input transformer in play, callers pass a `bigint` and the
// URL gets the digit string. Number-flavoured codecs round-trip even
// without the transformer (see INVESTIGATION-codecs.md), so this route
// is the ergonomic-typing test case rather than the runtime-fix case.
export const BlockNumberPathParams = z.object({
  blockNumber: Int64Codec
});

// Codec on a query parameter — the case the input transformer is built for.
// `IsoDateCodec.encode = (d) => d.toISOString()` does not equal `String(d)`,
// so without the transformer a Date in `since` would land in the URL as the
// locale string and the server's parser would reject it.
export const RecentMessagesQuery = z.object({
  cursor: z.string().optional(),
  since: IsoDateCodec.optional()
});
