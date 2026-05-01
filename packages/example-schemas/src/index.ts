// Schemas are exported under their registered names so the
// @polygonlabs/zod-to-openapi-heyapi plugin's generated client can import
// them by the same name it sees in the OpenAPI components map.
//
// schemas.ts calls extendZodWithOpenApi(z) at load time — keep importing
// from this barrel (or directly from schemas.ts) so the side effect runs
// before any caller chains .openapi(...) on the schema.
export {
  BlockMetadata,
  BlockNumberPathParams,
  BlockNumberResponse,
  CreateMessageRequest,
  HealthCheckResponse,
  HelloResponse,
  Message,
  MessageList,
  NotFound,
  RecentMessagesQuery,
  ValidationError
} from './schemas.ts';

// Re-export the canonical error response schema from
// `@polygonlabs/openapi-registry/error-schemas`. It matches what
// `createErrorHandler` from `@polygonlabs/express` actually emits, so
// declaring it on every operation's 4xx / 5xx response slots keeps the
// served spec, the runtime body, and the typed client in lockstep with
// no per-service drift. The subpath has zero Express-runtime imports —
// this re-export adds no transitive runtime weight to the codegen'd
// client or the frontend.
//
// Renamed to drop the `Schema` suffix so the binding matches the
// OpenAPI registered name (`ErrorResponse`). The
// `@polygonlabs/zod-to-openapi-heyapi` plugin's codegen-time audit
// fails the build if the export name doesn't match the registered
// name.
export { ErrorResponseSchema as ErrorResponse } from '@polygonlabs/openapi-registry/error-schemas';

// Registry composition — `buildRegistry` returns a TypedRegistry whose
// inferred return type carries every registered operation. `Operations` is
// the accumulator extracted from that return type; consumers of the
// registry-driven router use it for typed handler binding.
export { buildRegistry } from './registry.ts';
export type { Operations } from './registry.ts';
