// Re-exports everything from the schemas package.
// schemas.ts calls extendZodWithOpenApi(z) at load time — this is intentional.

export {
  BlockNumberResponseSchema,
  HealthCheckResponseSchema,
  HelloResponseSchema
} from './schemas.ts';

export type { BlockNumberResponse, HealthCheckResponse, HelloResponse } from './schemas.ts';
