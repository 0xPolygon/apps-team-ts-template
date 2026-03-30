// Must be first: initializes Sentry before any other module loads.
import './sentry.ts';
import { JsonRpcProvider, Network } from 'ethers';

import { getEnv } from './env.ts';
import { createLogger } from './logger.ts';
import { getExpressApp } from './server.ts';

const logger = await createLogger();

// Provider created once at startup and reused for the lifetime of the process.
// Never create providers inside request handlers or retry loops — each instance
// holds kernel socket buffers and libuv handles that accumulate faster than the
// GC can reclaim them under load, causing OOMKill.
// See: apps-team-ops/docs/best-practices/backend.md
//
// Network.from(chainId) as staticNetwork skips eth_chainId detection entirely:
// no outbound RPC call on startup, no background polling timer, clean process exit.
const provider = new JsonRpcProvider(getEnv().RPC_URL, undefined, {
  staticNetwork: Network.from(getEnv().RPC_CHAIN_ID)
});

const app = getExpressApp(logger, provider);

const server = app.listen(getEnv().PORT, () => {
  logger.info({ port: getEnv().PORT, nodeEnv: getEnv().NODE_ENV }, 'server started');
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
