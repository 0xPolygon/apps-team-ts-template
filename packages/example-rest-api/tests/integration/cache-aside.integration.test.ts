/**
 * Cache-aside integration test — the canonical "managed local resource"
 * example. It exercises the real app against a Firestore emulator AND Redis,
 * both stood up and discovered by vitest.globalSetup.ts.
 *
 * Two describes, by what each can prove and where it can run:
 *
 *  - "cache-aside (in-process)" — STATEFUL, `skipIf(isUrlTarget)`. Seeds
 *    Firestore and inspects Redis DIRECTLY, so it only runs in-process:
 *      · First read MISSES the cache, reads Firestore (source of truth), and
 *        POPULATES Redis.
 *      · A second read is served from the cache even after the Firestore
 *        document is deleted — unambiguous proof the value came from Redis.
 *      · Per-test isolation: `beforeEach` clears the Firestore collection so
 *        tests are order-independent. Run shuffled/repeated, they stay green.
 *        This is the most-missed part of stateful integration testing — and the
 *        thing the cache (keyed + TTL-bounded) never forces you to handle,
 *        which is why only the stateful store is reset.
 *
 *  - "widget route (any target)" — runs in-process AND against a deployed /
 *    containerised server (no skip), so docker-release exercises the release
 *    image's Redis + Firestore wiring end-to-end. A 404 still drives the full
 *    cache-aside path (miss → Firestore → not found), it just doesn't pre-seed.
 *
 * Calls go through the codegen client (`getWidget`) — the same typed surface a
 * real consumer uses. The one raw-supertest call is a deliberately
 * schema-unsafe path (a non-UUID id the client would never emit), to prove the
 * server's own request validation rejects it.
 */
import type { Firestore } from '@google-cloud/firestore';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { client, getWidget } from '@polygonlabs/example-client';

import type { RedisClient } from '../../src/redis.ts';

import { getEnv } from '../../src/env.ts';
import { createFirestore } from '../../src/firestore.ts';
import { createLogger } from '../../src/logger.ts';
import { createRedisClient } from '../../src/redis.ts';
import { WidgetStore } from '../../src/services/WidgetStore.ts';
import { closeAgent, getAgent, isUrlTarget } from './agent.ts';

// Mirrors WidgetService's internal cache key. The one string of coupling buys
// a direct assertion that the first read actually populated Redis.
const cacheKey = (id: string) => `widget:${id}`;

// Configure the shared agent/client once, and close it once — at module scope
// rather than per-describe, so neither describe's lifecycle tears the shared
// in-process server down while the other (under --sequence.shuffle) still needs
// it.
beforeAll(async () => {
  const { agent, baseUrl } = getAgent();
  // The widgets route is unauthenticated; the client only needs the base URL.
  client.setConfig({ baseUrl });
  await agent.get('/health-check').expect(200);
});

afterAll(() => closeAgent());

describe.skipIf(isUrlTarget)(
  'cache-aside (in-process): Firestore source of truth + Redis cache',
  () => {
    // The test owns its OWN Firestore + Redis clients — separate connections to
    // the same emulator / Redis the app uses (env populated by globalSetup) — so
    // it can seed the store and inspect the cache directly. Built in beforeAll
    // (not at describe scope) so a skipped run never opens a connection.
    let db!: Firestore;
    let store!: WidgetStore;
    let cache!: RedisClient;

    beforeAll(async () => {
      const logger = await createLogger();
      db = createFirestore();
      store = new WidgetStore(db);
      cache = createRedisClient({ redisUrl: getEnv().REDIS_URL, logger, cluster: false });
    });

    // Stateful-store isolation: wipe the Firestore collection before each test.
    beforeEach(async () => {
      await store.clear();
    });

    afterAll(async () => {
      await cache.quit();
      await db.terminate();
    });

    it('populates the cache on first read and serves it after the source is deleted', async () => {
      const id = randomUUID();
      await store.put({ id, name: 'flux-capacitor' });

      // First read: cache miss → Firestore → populate Redis.
      const first = await getWidget({ path: { id } });
      expect(first.error).toBeUndefined();
      expect(first.data).property('id', id);
      expect(first.data).property('name', 'flux-capacitor');

      // The first read populated the cache.
      expect(await cache.get(cacheKey(id))).not.toBeNull();

      // Delete the source of truth, then read again. A store-backed read would
      // now 404; a cache-aside read still serves the cached copy.
      await store.delete(id);
      expect(await store.get(id)).toBeNull();

      const second = await getWidget({ path: { id } });
      expect(second.error).toBeUndefined();
      expect(second.data).property('id', id);
      expect(second.data).property('name', 'flux-capacitor');
    });

    it('serves a different widget independently — proves per-test isolation under shuffle', async () => {
      const id = randomUUID();
      await store.put({ id, name: 'sonic-screwdriver' });

      const { data, error } = await getWidget({ path: { id } });
      expect(error).toBeUndefined();
      expect(data).property('name', 'sonic-screwdriver');
    });
  }
);

describe('widget route (any target): read path + validation', () => {
  it('returns 404 for an unknown widget', async () => {
    // Drives the full cache-aside path with no seed: miss → Firestore → null →
    // 404. Against a deployed container this proves the image's Redis +
    // Firestore wiring works end-to-end.
    const { data, error, response } = await getWidget({ path: { id: randomUUID() } });
    expect(data).toBeUndefined();
    expect(response.status).toBe(404);
    expect(error).property('error', true);
    expect(error?.message).toMatch(/not found/i);
  });

  it('responds 400 when the path id is not a UUID', async () => {
    // Deliberately schema-unsafe input the codegen client would never emit —
    // the one sanctioned use of the raw agent: proving the server's own request
    // validation rejects it before the handler runs.
    const res = await getAgent().agent.get('/api/widgets/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body).property('error', true);
    expect(res.body.info?.params?.properties?.id?.errors?.length).greaterThan(0);
  });
});
