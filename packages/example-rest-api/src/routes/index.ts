import { Router } from 'express';

import { openApiRouter } from './openapi.ts';

export function buildRouter(): Router {
  const router = Router();

  router.use('/', openApiRouter);

  router.get('/hello', async (_req, res) => {
    res.json({ message: 'Hello, world!' });
  });

  return router;
}
