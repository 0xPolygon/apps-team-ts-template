/**
 * Static handlers — operations with no dependencies. Exposed as a typed
 * partial via `defineHandlers<Operations>()` so `.implement(...)` enforces
 * exhaustive composition across all handler modules at compile time.
 */

import type { Operations } from '@polygonlabs/example-schemas';

import { getLogger } from '@polygonlabs/express';
import { defineHandlers } from '@polygonlabs/express/registry';

export function buildStaticHandlers() {
  return defineHandlers<Operations>()({
    getHealthCheck: (_req, res) => {
      res.json({ success: true });
    },
    getHello: (_req, res) => {
      getLogger().debug('hello endpoint called');
      res.json({ message: 'Hello, world!' });
    }
  });
}
