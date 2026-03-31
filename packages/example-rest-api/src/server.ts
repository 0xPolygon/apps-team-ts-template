import type { JsonRpcProvider } from 'ethers';
import type { NextFunction, Request, Response } from 'express';

import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { json } from 'express';
import helmet from 'helmet';

import { HTTPError, NotFound } from '@polygonlabs/verror';

import type { Logger } from './logger.ts';

import { buildRouter } from './routes/index.ts';

declare module 'express-serve-static-core' {
  interface Request {
    log: Logger;
  }
}

export function getExpressApp(logger: Logger, provider: JsonRpcProvider) {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(json());

  app.use((req, _res, next) => {
    req.log = logger.child({ requestId: randomUUID() });
    next();
  });

  app.get('/health-check', (_req, res) => {
    res.json({ success: true });
  });

  app.use('/api', buildRouter(provider));

  app.use((req, res) => {
    const err = new NotFound(`${req.method} ${req.path}`);
    res.status(404).json({ error: true, message: err.message });
  });

  // Global error handler — must declare all four parameters so Express
  // recognises it as an error-handling middleware, not a regular handler.
  // Only log server errors (>=500); 4xx are client errors and expected.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof HTTPError ? err.statusCode : 500;

    if (status >= 500) {
      req.log.debug({ err }, 'unhandled error');
    }

    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(status).json({ error: true, message });
  });

  return app;
}
