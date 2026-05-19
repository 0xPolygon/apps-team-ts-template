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
  RecentMessagesQuery
} from './schemas.ts';

// Re-export the canonical error response schemas from
// `@polygonlabs/openapi-registry/error-schemas`. The registry's
// `TypedRegistry.registerPath` auto-injects these into every route's
// `responses` based on what the route declares — `ErrorResponse` for
// 5xx (always) and 401 (when `security` is declared), and
// `ValidationErrorResponse` for 400 (when any of `request.{params,
// query, body, headers}` is declared). The shapes exactly match what
// `createErrorHandler` and the request validator from
// `@polygonlabs/express` actually emit, so the served spec, the
// runtime body, and the typed client agree without per-service drift.
//
// The subpath has zero Express-runtime imports — these re-exports add
// no transitive runtime weight to the codegen'd client or the frontend.
//
// Renamed to drop the `Schema` suffix so the binding matches the
// OpenAPI registered name (`ErrorResponse` / `ValidationErrorResponse`).
// The `@polygonlabs/zod-to-openapi-heyapi` plugin's codegen-time audit
// fails the build if the export name doesn't match the registered name.
export {
  ErrorResponseSchema as ErrorResponse,
  ValidationErrorResponseSchema as ValidationErrorResponse
} from '@polygonlabs/openapi-registry/error-schemas';

// Registry composition — `buildRegistry` is a chained `TypedRegistry`
// builder; every chain step's narrow flows through the inferred return
// into anything that consumes `typeof buildRegistry`. Service handlers
// derive their typed manifest from it directly via
// `HandlerMapFor<typeof buildRegistry, AppAuthMap>` (see
// `@polygonlabs/express/registry`); no separate `Operations` alias is
// needed or re-exported here.
export { buildRegistry } from './registry.ts';
