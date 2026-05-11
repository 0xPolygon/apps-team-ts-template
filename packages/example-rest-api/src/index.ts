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

// Graceful shutdown: stop accepting new connections, let in-flight
// requests finish, and set the exit code. We deliberately do NOT call
// process.exit() — that aborts pending async work (Sentry transport
// sends, async stdout writes to the container log collector), which
// can drop the final error reports and log lines just before shutdown.
//
// Once server.close() has drained connections and no other handles are
// keeping the event loop alive, Node exits naturally with the assigned
// exitCode. If shutdown hangs because a library leaked a timer or
// socket, fix the leak in that code (unref the timer, close the
// socket) — don't paper over it by force-exiting.
//
// Ref: https://nodejs.org/api/process.html#processexitcode
const shutdown = () => {
  server.close(() => {
    process.exitCode = 0;
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
