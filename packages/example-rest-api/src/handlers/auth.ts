/**
 * Auth-handler factory for the registry-driven router. Wired declaratively
 * via `.auth({ ApiKeyAuth: ... })`; runs before request validation for any
 * operation declaring `security: [{ ApiKeyAuth: [] }]` (see
 * `@polygonlabs/example-schemas`'s registry).
 *
 * The exported `AppAuthMap` type is what handler modules import so their
 * typed `req.auth` lines up with what the router actually provides at
 * runtime — when an operation declares `ApiKeyAuth`, `req.auth.ApiKeyAuth`
 * carries this factory's return value.
 */

import type { Request } from 'express';

import { NotAuthenticated } from '@polygonlabs/verror';

import type { Env } from '../env.ts';

export function buildAuthHandlers(env: Env) {
  return {
    ApiKeyAuth: (req: Request) => {
      if (req.headers['x-api-key'] !== env.MANAGEMENT_API_KEY) {
        throw new NotAuthenticated('Unauthorized');
      }
    }
  };
}

/**
 * Auth-handler-map type derived from the factory's inferred return. Handler
 * modules pass this as the second type parameter to
 * `defineHandlers<Operations, AppAuthMap>()` so their `req.auth` matches
 * what the router resolves at runtime.
 */
export type AppAuthMap = ReturnType<typeof buildAuthHandlers>;
