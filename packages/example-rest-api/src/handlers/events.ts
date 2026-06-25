/**
 * Event handler — the read side of the indexer→db→REST showcase. Delegates to
 * `EventQueryService.list`, which reads `example-db`'s `EventStore` (the same
 * store `example-indexer` writes to) and projects rows onto the API shape.
 *
 * The query was already validated and coerced against `ListEventsQuery` by the
 * registry-driven router before this handler runs, so `req.query.chain` /
 * `req.query.limit` arrive as numbers.
 */

import type { buildRegistry } from '@polygonlabs/example-schemas';
import type { HandlerMapFor } from '@polygonlabs/express/registry';

import type { EventQueryService } from '../services/EventQueryService.ts';

export const buildEventHandlers = (deps: { getEventQueryService: () => EventQueryService }) =>
  ({
    listEvents: async (req, res) => {
      const page = await deps.getEventQueryService().list({
        chain: req.query.chain,
        contractAddress: req.query.contractAddress,
        eventName: req.query.eventName,
        cursor: req.query.cursor,
        limit: req.query.limit
      });
      res.json(page);
    }
  }) satisfies Partial<HandlerMapFor<typeof buildRegistry>>;
