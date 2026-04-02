// Must be first: initializes Sentry before any other module loads.
import './sentry.ts';
import { getEnv } from './env.ts';
import { createLogger } from './logger.ts';
import { createServer } from './server.ts';

const logger = await createLogger();
const app = createServer(logger);

const server = app.listen(getEnv().PORT, () => {
  logger.info({ port: getEnv().PORT, nodeEnv: getEnv().NODE_ENV }, 'server started');
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
