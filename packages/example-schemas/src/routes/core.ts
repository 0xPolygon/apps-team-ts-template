/**
 * Core routes — service-level concerns (liveness, hello). These have no
 * dependencies on other registered schemas; they're the smallest possible
 * domain and a useful template for adding others.
 */

import type { OperationsManifest, TypedRegistry } from '@polygonlabs/openapi-registry';

import { HealthCheckResponse, HelloResponse } from '../schemas.ts';

/**
 * Polymorphic over `Prev` so the helper preserves whatever ops the caller
 * has already registered. Each `r.registerPath(...)` narrows `r` via
 * `asserts this is X`; the inferred return captures the cumulative narrow
 * for `registry.extend(...)` to assert at the call site.
 */
export function addCoreRoutes<Prev extends OperationsManifest>(r: TypedRegistry<Prev>) {
  r.registerPath({
    operationId: 'getHealthCheck',
    method: 'get',
    path: '/health-check',
    summary: 'Liveness check',
    responses: {
      200: {
        description: 'Service is alive',
        content: { 'application/json': { schema: HealthCheckResponse } }
      }
    }
  });

  r.registerPath({
    operationId: 'getHello',
    method: 'get',
    path: '/api/hello',
    summary: 'Hello world',
    responses: {
      200: {
        description: 'Greeting response',
        content: { 'application/json': { schema: HelloResponse } }
      }
    }
  });

  return r;
}
