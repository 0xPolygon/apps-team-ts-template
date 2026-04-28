import { Router } from 'express';

import type { NetworkService } from '../services/NetworkService.ts';

import { openApiRouter } from './openapi.ts';

export function buildRouter({
  blockNumberService
}: {
  blockNumberService: NetworkService<number>;
}): Router {
  const router = Router();

  router.use('/', openApiRouter);

  router.get('/hello', (req, res) => {
    req.log.debug('hello endpoint called');
    res.json({ message: 'Hello, world!' });
  });

  // service.get() awaits the first poll if the initial fetch hasn't completed
  // yet, so this route never returns a stale null — it simply waits.
  //
  // The wire shape declared by `BlockNumberResponse` uses `Int64Codec` —
  // wire format is a digit string, runtime is `bigint`. The provider's
  // getBlockNumber() returns a number that fits comfortably in int64, so
  // we stringify on serialise; the generated client decodes back to bigint
  // before the value reaches the caller.
  router.get('/block-number', async (req, res) => {
    const blockNumber = await blockNumberService.get();
    req.log.debug({ blockNumber }, 'block number fetched');
    res.json({ blockNumber: String(blockNumber) });
  });

  return router;
}
