// Must be first: initializes Sentry before any other module loads.
import './sentry.ts';
import { getEnv } from './env.ts';
import { createLogger } from './logger.ts';
import { createServer } from './server.ts';
import { initializeServices } from './services.ts';

const logger = await createLogger();

try {
  const { consumer, cursorStore, chainId, contractAddress, network } = initializeServices(logger);

  // Start the background backfill→live consumer loop, then serve the health
  // surface. The consumer runs independently of the HTTP server.
  consumer.start();

  const app = createServer({ logger, cursorStore, chainId, contractAddress, network });

  const server = app.listen(getEnv().PORT, () => {
    logger.info({ port: getEnv().PORT, chainId, contractAddress, network }, 'indexer started');
  });

  // Graceful shutdown: stop the consumer's stream between viem calls, drain
  // in-flight HTTP requests, and let Node exit naturally (no process.exit —
  // it would abort pending async log/Sentry flushes).
  const shutdown = () => {
    consumer.stop();
    server.close(() => {
      process.exitCode = 0;
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  logger.error({ err: error as Error }, 'startup error');
  process.exitCode = 1;
}
