/**
 * Static handlers — operations with no dependencies. Exposed as a typed
 * partial via `satisfies Partial<HandlerMapFor<…>>` so `.implement(...)`
 * enforces exhaustive composition across all handler modules at compile
 * time.
 */

import type { buildRegistry } from '@polygonlabs/example-schemas';
import type { HandlerMapFor } from '@polygonlabs/express/registry';

import { getLogger } from '@polygonlabs/express';

export const buildStaticHandlers = () =>
  ({
    getHealthCheck: (_req, res) => {
      res.json({ success: true });
    },
    getHello: (_req, res) => {
      getLogger().debug('hello endpoint called');
      res.json({ message: 'Hello, world!' });
    }
  }) satisfies Partial<HandlerMapFor<typeof buildRegistry>>;
