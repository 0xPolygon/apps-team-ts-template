import type { Cron } from 'croner';

import { EventEmitter } from 'node:events';

import cors from 'cors';
import { JsonRpcProvider, Network } from 'ethers';
import express, { json } from 'express';
import helmet from 'helmet';

import { createErrorHandler, notFoundHandler, setupLogger } from '@polygonlabs/express';

import type { Logger } from './logger.ts';

import { getEnv } from './env.ts';
import { buildRouter } from './routes/index.ts';
import { NetworkService } from './services/NetworkService.ts';

export type ServerEventMap = {
  /** Emitted when the cron is registered, after listen() is called. */
  cronRegistered: [{ name: 'blockNumber'; cron: Cron }];
};

// Module-level emitter so consumers can subscribe before createServer()
// returns and capture the cron handle from the cronRegistered event.
export const serverEvents = new EventEmitter() as EventEmitter & {
  emit<K extends keyof ServerEventMap>(event: K, ...args: ServerEventMap[K]): boolean;
  on<K extends keyof ServerEventMap>(
    event: K,
    listener: (...args: ServerEventMap[K]) => void
  ): EventEmitter;
};

/**
 * Creates a fully configured Express app with all routes already bound.
 * Reads env, creates the provider singleton, and mounts routes — everything
 * except starting the HTTP server and background services.
 *
 * Call .listen() on the returned app to start serving. The listen() override
 * creates a NetworkService that polls the block number every 5 seconds,
 * emits `cronRegistered`, and wires up cleanup on server close.
 *
 * The route handler calls service.get() which awaits the first poll if it
 * hasn't completed yet — no 503 fallback, no manual triggering needed.
 */
export function createServer(logger: Logger) {
  const env = getEnv();

  // Provider created once per process — never inside a request handler.
  // See apps-team-ops/docs/best-practices/backend.md for why.
  const provider = new JsonRpcProvider(env.RPC_URL, undefined, {
    staticNetwork: Network.from(env.RPC_CHAIN_ID)
  });

  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(json());
  // setupLogger does two things in one call: captures `logger` as the
  // out-of-request fallback for getLogger(), and returns middleware that
  // wraps every request in an AsyncLocalStorage scope holding a child
  // logger tagged with a fresh requestId. Route and service code calls
  // getLogger() to access it without threading req or a logger parameter
  // through every signature.
  app.use(setupLogger(logger));

  app.get('/health-check', (_req, res) => {
    res.json({ success: true });
  });

  // Override listen — responsible for creating the NetworkService and wiring cleanup.
  const _listen = app.listen.bind(app);
  app.listen = function (...args: Parameters<typeof _listen>) {
    const blockNumberService = new NetworkService(
      () => provider.getBlockNumber(),
      5,
      'blockNumber',
      logger
    );

    serverEvents.emit('cronRegistered', { name: 'blockNumber', cron: blockNumberService['job'] });

    app.use('/api', buildRouter({ blockNumberService }));

    // Mount last: notFoundHandler converts unmatched paths into NotFound,
    // createErrorHandler maps HTTPError subclasses onto status codes and
    // sanitises ethers fetch errors before either logging or responding.
    app.use(notFoundHandler);
    app.use(createErrorHandler());

    const server = _listen(...args);
    server.on('close', () => {
      blockNumberService.stop();
      serverEvents.removeAllListeners();
    });
    return server;
  } as typeof app.listen;

  return app;
}
