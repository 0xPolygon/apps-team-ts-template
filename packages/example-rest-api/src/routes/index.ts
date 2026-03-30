import { Router } from 'express';

import { openApiRouter } from './openapi.ts';

export function buildRouter(): Router {
  const router = Router();

  router.use('/', openApiRouter);

  router.get('/hello', (req, res) => {
    req.log.debug('hello endpoint called');
    res.json({ message: 'Hello, world!' });
  });

  return router;
}
