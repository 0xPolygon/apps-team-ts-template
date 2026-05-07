/**
 * Core routes — service-level concerns (liveness, hello). These have no
 * dependencies on other registered schemas; they're the smallest possible
 * domain and a useful template for adding others.
 */

import type { RouteWithOpId, TypedRegistry } from '@polygonlabs/openapi-registry';

import { HealthCheckResponse, HelloResponse } from '../schemas.ts';

/**
 * Generic over the parent's `Ops` and `Schemes` so the helper preserves
 * everything the caller had already registered. The chained `registerPath`
 * calls narrow the registry; the return carries the cumulative narrow
 * back through the outer `.with(addCoreRoutes)` call.
 */
export const addCoreRoutes = <
  Ops extends Record<string, RouteWithOpId>,
  Schemes extends Record<string, true>
>(
  r: TypedRegistry<Ops, Schemes>
) =>
  r
    .registerPath({
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
    })
    .registerPath({
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
