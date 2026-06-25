import type { Application } from 'express';

import cors from 'cors';
import express, { json } from 'express';
import helmet from 'helmet';

import type { CursorStore } from '@polygonlabs/example-db';

import { createErrorHandler, getLogger, notFoundHandler, setupLogger } from '@polygonlabs/express';

import type { Logger } from './logger.ts';

/**
 * Builds the indexer's small HTTP surface: a Kubernetes liveness probe
 * (`/health-check`) and an operational `/service-status` for Datadog
 * Synthetics. `/service-status` reports the per-chain ingestion cursor read
 * fresh from the store — never a cached copy — so it reflects how far indexing
 * has actually progressed.
 */
export function createServer({
  logger,
  cursorStore,
  chainId,
  contractAddress,
  network
}: {
  logger: Logger;
  cursorStore: CursorStore;
  chainId: number;
  contractAddress: string;
  network: string;
}): Application {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(json());

  // Mounts the per-request child-logger middleware and primes the
  // out-of-request fallback that `getLogger()` reads.
  app.use(setupLogger(logger));

  // Liveness only — never operational metrics (team standard).
  app.get('/health-check', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/service-status', async (_req, res) => {
    const lastProcessedBlock = await cursorStore.getLastProcessedBlock(chainId);
    getLogger().debug({ chainId, lastProcessedBlock }, 'service-status');
    res.json({ network, chainId, contractAddress, lastProcessedBlock });
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
