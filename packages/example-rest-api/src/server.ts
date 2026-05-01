import type { Cron } from 'croner';

import { EventEmitter } from 'node:events';

import cors from 'cors';
import { JsonRpcProvider, Network } from 'ethers';
import express, { json } from 'express';
import helmet from 'helmet';

import { buildRegistry } from '@polygonlabs/example-schemas';
import { createErrorHandler, notFoundHandler, setupLogger } from '@polygonlabs/express';
import { createRegistryRouter } from '@polygonlabs/express/registry';

import type { Logger } from './logger.ts';

import { getEnv } from './env.ts';
import { buildAuthHandlers } from './handlers/auth.ts';
import { buildMessageHandlers } from './handlers/messages.ts';
import { buildNetworkHandlers } from './handlers/network.ts';
import { buildStaticHandlers } from './handlers/static.ts';
import { openApiRouter } from './routes/openapi.ts';
import { MessageStore } from './services/MessageStore.ts';
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

/** Block-header fields the app surfaces; see operations.ts BlockMetadata. */
export type BlockData = {
  number: bigint;
  hash: string;
  parentHash: string;
  timestamp: bigint;
};

/**
 * Optional dependency overrides. Production wiring uses the env-configured
 * provider for both fetchers (the default factories below); tests inject
 * stubs so the test suite never depends on a reachable RPC endpoint.
 *
 * The provider singleton is constructed lazily — only when at least one
 * default factory is actually invoked — so tests overriding both fetchers
 * never touch ethers and never need RPC_URL / RPC_CHAIN_ID set at all
 * beyond what the env schema requires for validation.
 */
export type ServerDependencies = {
  getBlockNumber?: () => Promise<number>;
  getBlock?: (blockNumber: bigint) => Promise<BlockData | null>;
};

/**
 * Creates a fully configured Express app with all routes already bound.
 * Reads env, creates the provider singleton (lazily — see ServerDependencies),
 * and mounts routes — everything except starting the HTTP server and
 * background services.
 *
 * Routes are derived from the typed `Operations` manifest exported by
 * `@polygonlabs/example-schemas`. The registry router validates each request
 * against the registered Zod schemas (codec-decoded `req.params/query/body`
 * reach handlers as runtime types) and re-encodes responses on the way out
 * — the same Zod values that produced the spec and the codegen'd client.
 *
 * Call .listen() on the returned app to start serving. The listen() override
 * creates a NetworkService that polls the block number every 5 seconds,
 * emits `cronRegistered`, and wires up cleanup on server close.
 */
export function createServer(logger: Logger, deps: ServerDependencies = {}) {
  const env = getEnv();

  // Lazily construct the provider only when a default fetcher actually needs
  // it. Tests passing stubs for both fetchers never trigger this path, so the
  // provider is never created and RPC URLs are never opened.
  let _provider: JsonRpcProvider | undefined;
  const getProvider = () => {
    if (_provider === undefined) {
      _provider = new JsonRpcProvider(env.RPC_URL, undefined, {
        staticNetwork: Network.from(env.RPC_CHAIN_ID)
      });
    }
    return _provider;
  };

  const getBlockNumber = deps.getBlockNumber ?? (() => getProvider().getBlockNumber());
  const getBlock =
    deps.getBlock ??
    (async (blockNumber: bigint): Promise<BlockData | null> => {
      // Production block heights fit comfortably in Number; ethers v6
      // accepts bigint via BigNumberish but the codepath is well-trodden
      // for number, so coerce to keep behaviour identical to historical
      // usage. Int64Codec on the wire still validates the digit-string
      // format — this conversion only happens after the codec has accepted
      // the input.
      const block = await getProvider().getBlock(Number(blockNumber));
      if (block === null) return null;
      return {
        number: BigInt(block.number),
        hash: block.hash ?? '',
        parentHash: block.parentHash,
        timestamp: BigInt(block.timestamp)
      };
    });

  const messageStore = new MessageStore();

  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(json());

  // `setupLogger` mounts the per-request child-logger middleware AND primes
  // the out-of-request fallback that `getLogger()` reads. Handlers reach the
  // request-scoped logger via `getLogger()` from `@polygonlabs/express`
  // rather than threading a `log` field on `req`.
  app.use(setupLogger(logger));

  // Override listen — responsible for creating the NetworkService and wiring cleanup.
  const _listen = app.listen.bind(app);
  app.listen = function (...args: Parameters<typeof _listen>) {
    const blockNumberService = new NetworkService(getBlockNumber, 5, 'blockNumber', logger);

    serverEvents.emit('cronRegistered', { name: 'blockNumber', cron: blockNumberService['job'] });

    // The single source of truth — TypedRegistry's accumulated narrow flows
    // through buildRegistry's inferred return type into `Operations`.
    const registry = buildRegistry();

    // Compose handler bags via per-domain factories. Each factory returns a
    // partial `HandlerMap<Operations, AppAuthMap>` typed bag from
    // `defineHandlers(...)`; the router's `.implement(...)` chain enforces
    // exhaustive coverage at compile time — a missing handler is a TS error
    // at this call site, not a runtime surprise. Auth runs declaratively via
    // `.auth(...)`: any operation declaring `security: [{ ApiKeyAuth: [] }]`
    // requires the `ApiKeyAuth` handler to authenticate before request
    // validation runs.
    const registryRouter = createRegistryRouter({ registry })
      .auth(buildAuthHandlers(env))
      .implement(buildStaticHandlers())
      .implement(buildNetworkHandlers({ blockNumberService, getBlock }))
      .implement(buildMessageHandlers(messageStore))
      .toExpress();

    // Mount the registry-driven routes flat at the app root. Operation paths
    // in the manifest are absolute (`/health-check`, `/api/messages`, ...).
    app.use(registryRouter);

    // Out-of-band routes deliberately not in the registry: the spec and
    // interactive docs serve themselves.
    app.use('/api', openApiRouter);

    // Team-standard middleware: `notFoundHandler` throws `NotFound` so the
    // global error handler answers uniformly; `createErrorHandler` maps
    // `HTTPError.statusCode` (so `NotAuthenticated` from the auth handler
    // produces 401, not 500), sanitises ethers fetch errors (which embed
    // RPC URLs including auth tokens) before logging or responding, and
    // surfaces structured `info` from `HTTPError` instances to the response
    // body — which is how the validator's `BadRequest` carries the
    // `z.treeifyError` tree to clients.
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
