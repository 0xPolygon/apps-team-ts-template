import type { JsonRpcProvider } from 'ethers';

import { Router } from 'express';

import { VError } from '@polygonlabs/verror';

import { openApiRouter } from './openapi.ts';

export function buildRouter(provider: JsonRpcProvider): Router {
  const router = Router();

  router.use('/', openApiRouter);

  router.get('/hello', (req, res) => {
    req.log.debug('hello endpoint called');
    res.json({ message: 'Hello, world!' });
  });

  // The provider is the singleton created in index.ts — not re-created per
  // request. Wrap the call in VError so the log boundary sees context about
  // what was being attempted without needing to know the caller's internals.
  router.get('/block-number', async (req, res) => {
    try {
      const blockNumber = await provider.getBlockNumber();
      req.log.debug({ blockNumber }, 'block number fetched');
      return res.json({ blockNumber });
    } catch (err) {
      throw new VError('Failed to fetch block number from RPC', { cause: err as Error });
    }
  });

  return router;
}
