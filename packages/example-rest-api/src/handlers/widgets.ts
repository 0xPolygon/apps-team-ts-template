/**
 * Widget handler — the read side of the cache-aside example. Delegates to
 * `WidgetService.getById`, which checks Redis then falls back to Firestore.
 *
 * A missing widget throws `NotFound` (from `@polygonlabs/verror`) rather than
 * writing `res.status(404)` by hand: the global `createErrorHandler` maps the
 * `HTTPError.statusCode` to the response and emits the canonical
 * `ErrorResponse` body, so the served spec, the runtime body, and the typed
 * client stay in agreement without per-handler status wiring.
 */

import type { buildRegistry } from '@polygonlabs/example-schemas';
import type { HandlerMapFor } from '@polygonlabs/express/registry';

import { NotFound } from '@polygonlabs/verror';

import type { WidgetService } from '../services/WidgetService.ts';

export const buildWidgetHandlers = (deps: { getWidgetService: () => WidgetService }) =>
  ({
    getWidget: async (req, res) => {
      const widget = await deps.getWidgetService().getById(req.params.id);
      if (widget === null) {
        throw new NotFound(`Widget ${req.params.id} not found`);
      }
      res.json(widget);
    }
  }) satisfies Partial<HandlerMapFor<typeof buildRegistry>>;
