/**
 * Event route — the read side of the indexer→db→REST showcase. `GET /events`
 * serves the decoded on-chain logs that `example-indexer` wrote to `example-db`
 * via `@polygonlabs/viem-event-watcher`. An ordinary registry GET with optional
 * equality filters and opaque-cursor pagination.
 *
 * 400 (query validation failure) is auto-injected from `request.query`.
 */

import type { RouteWithOpId, TypedRegistry } from '@polygonlabs/openapi-registry';

import { ErrorResponseSchema as ErrorResponse } from '@polygonlabs/openapi-registry/error-schemas';

import { EventList, ListEventsQuery } from '../schemas.ts';

export const addEventRoutes = <
  Ops extends Record<string, RouteWithOpId>,
  Schemes extends Record<string, true>
>(
  r: TypedRegistry<Ops, Schemes>
) =>
  r.registerPath({
    operationId: 'listEvents',
    method: 'get',
    path: '/events',
    summary: 'List indexed on-chain events',
    description:
      'Returns decoded events indexed by example-indexer, newest-first, with ' +
      'optional chain / contractAddress / eventName filters and opaque-cursor ' +
      'pagination.',
    request: {
      query: ListEventsQuery
    },
    responses: {
      200: {
        description: 'Page of indexed events',
        content: { 'application/json': { schema: EventList } }
      },
      // Handler-emitted: a syntactically valid `cursor` string that doesn't
      // decode to a usable cursor. Distinct from the 400 the registry
      // auto-injects for query-schema validation failures.
      422: {
        description: 'Malformed pagination cursor',
        content: { 'application/json': { schema: ErrorResponse } }
      }
    }
  });
