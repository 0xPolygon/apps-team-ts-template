import type { Cluster, Redis } from 'ioredis';

import { Cluster as IORedisCluster, Redis as IORedis } from 'ioredis';

import type { Logger } from './logger.ts';

/**
 * Thin Redis wrapper for the cache-aside example — `get`, `set` with a TTL,
 * and `quit`. Mirrors the shape of a real service's cache client
 * (see balance-api/src/redis.ts) without the price-specific surface.
 *
 * The `host:port` URL format is a convention across our services: the env var
 * is named `REDIS_URL` but the value is not a `redis://...` URI. It's parsed
 * here so the rest of the app stays unaware of the format.
 *
 * `cluster: false` (the default for this example) selects a standalone client
 * (`new Redis`). A plain `redis:7-alpine` — what docker-compose brings up —
 * doesn't answer `CLUSTER SLOTS`, so the Cluster client can't talk to it. A
 * production single-node cluster would set `REDIS_CLUSTER=true`.
 */
// How long the first command waits for the initial connection before
// proceeding anyway (and failing fast via the disabled offline queue if Redis
// is genuinely unreachable).
const READY_GRACE_MS = 5_000;

export type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds: number) => Promise<unknown>;
  quit: () => Promise<void>;
};

export function createRedisClient({
  redisUrl,
  logger,
  cluster = false
}: {
  redisUrl: string;
  logger: Logger;
  cluster?: boolean;
}): RedisClient {
  const [host, port] = redisUrl.split(':');
  if (!host || !port) {
    throw new Error('REDIS_URL must be in "host:port" format');
  }

  // `enableOfflineQueue: false` makes commands reject immediately when Redis
  // is unreachable instead of queueing (and hanging) until it returns — the
  // cache surfaces the error rather than silently stalling the request. For
  // Cluster the option is top-level; standalone takes it in the constructor.
  const client: Cluster | Redis = cluster
    ? new IORedisCluster([{ host, port: Number(port) }], {
        enableOfflineQueue: false,
        redisOptions: { maxRetriesPerRequest: null }
      })
    : new IORedis({
        host,
        port: Number(port),
        maxRetriesPerRequest: null,
        enableOfflineQueue: false
      });

  // Log availability transitions once, not per command: a reconnect storm
  // fires 'error'/'close' repeatedly and would otherwise flood the logs.
  let healthy = false;
  let loggedDown = false;
  client.on('ready', () => {
    healthy = true;
    if (loggedDown) {
      logger.info('Redis connection restored');
      loggedDown = false;
    }
  });
  client.on('close', () => {
    if (healthy && !loggedDown) {
      logger.warn('Redis connection lost');
      loggedDown = true;
    }
    healthy = false;
  });
  // ioredis throws on an 'error' event with no listener, so keep one — the
  // meaningful signal is the ready/close transition above; record the cause
  // at debug so a reconnect storm can't flood the logs.
  client.on('error', (err) => {
    logger.debug({ err }, 'Redis error');
  });

  // `enableOfflineQueue: false` rejects commands the instant the socket isn't
  // writeable — correct for a hard dependency mid-operation, but it races the
  // INITIAL connect: a command issued in the same tick the client is built
  // (as a lazily-constructed cache does on its first request) fires before
  // 'ready' and gets "Stream isn't writeable". Gate commands on a one-time
  // readiness signal so the first call awaits the connect instead of
  // rejecting. The grace timeout means a genuinely-unreachable Redis still
  // surfaces a fast command error (offline queue stays off) rather than
  // hanging forever.
  const ready = new Promise<void>((resolve) => {
    if (client.status === 'ready') {
      resolve();
      return;
    }
    client.once('ready', () => resolve());
    setTimeout(resolve, READY_GRACE_MS).unref();
  });

  return {
    get: async (key) => {
      await ready;
      return client.get(key);
    },
    set: async (key, value, ttlSeconds) => {
      await ready;
      return client.set(key, value, 'EX', ttlSeconds);
    },
    quit: async () => {
      await client.quit();
    }
  };
}
