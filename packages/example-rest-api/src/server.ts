import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { buildRouter } from './routes/index.ts';

export function getExpressApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());

  app.get('/health-check', async (_req, res) => {
    res.json({ success: true });
  });

  app.use('/api', buildRouter());

  return app;
}
