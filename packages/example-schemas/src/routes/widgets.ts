/**
 * Widget route — the read side of the cache-aside example. `GET
 * /api/widgets/{id}` reads a widget that lives in Firestore (the source of
 * truth) through a Redis cache in front of it. The route itself is an
 * ordinary registry GET; what makes it the canonical "managed local
 * resource" example is the service package's integration suite, which stands
 * up a Firestore emulator AND Redis from one `vitest.globalSetup` and proves
 * the cache-aside behaviour end-to-end. See
 * `packages/example-rest-api/tests/integration/`.
 *
 * 400 (path UUID validation failure) is auto-injected from `request.params`.
 * 404 is handler-emitted, so it's declared explicitly with the canonical
 * `ErrorResponse` shape — same pattern as `getMessage`.
 */

import { z } from 'zod';

import type { RouteWithOpId, TypedRegistry } from '@polygonlabs/openapi-registry';

import { ErrorResponseSchema as ErrorResponse } from '@polygonlabs/openapi-registry/error-schemas';

import { Widget } from '../schemas.ts';

export const addWidgetRoutes = <
  Ops extends Record<string, RouteWithOpId>,
  Schemes extends Record<string, true>
>(
  r: TypedRegistry<Ops, Schemes>
) =>
  r.registerPath({
    operationId: 'getWidget',
    method: 'get',
    path: '/api/widgets/{id}',
    summary: 'Get a widget by id',
    description:
      'Reads a widget from Firestore through a Redis cache (cache-aside). ' +
      'First read populates the cache; subsequent reads are served from it.',
    request: {
      params: z.object({ id: z.uuid() })
    },
    responses: {
      200: {
        description: 'Widget',
        content: { 'application/json': { schema: Widget } }
      },
      404: {
        description: 'Not found',
        content: { 'application/json': { schema: ErrorResponse } }
      }
    }
  });
