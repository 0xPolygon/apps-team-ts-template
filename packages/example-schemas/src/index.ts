// Schemas are exported under their registered names so the
// @polygonlabs/zod-to-openapi-heyapi plugin's generated client can import
// them by the same name it sees in the OpenAPI components map.
//
// schemas.ts calls extendZodWithOpenApi(z) at load time — keep importing
// from this barrel (or directly from schemas.ts) so the side effect runs
// before any caller chains .openapi(...) on the schema.
export { BlockNumberResponse, HealthCheckResponse, HelloResponse } from './schemas.ts';
