/**
 * GET /events integration test — the read side of the indexer→db→REST showcase.
 *
 * It seeds `example-db`'s `EventStore` DIRECTLY (the same store
 * `example-indexer` writes to) against the Firestore emulator stood up by
 * vitest.globalSetup.ts, then reads the events back through the REST API's
 * codegen client. That proves the cross-service contract end-to-end without
 * needing the indexer or a chain: indexer writes snake_case storage rows, the
 * API serves the camelCase projection, newest-first, with opaque-cursor
 * pagination.
 *
 * STATEFUL (seeds Firestore directly), so it runs in-process only —
 * `skipIf(isUrlTarget)`, mirroring the cache-aside suite. `beforeEach` wipes
 * the collection so tests are order-independent under shuffle.
 */
import type { Firestore } from '@google-cloud/firestore';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { IndexedEvent } from '@polygonlabs/example-db';

import { client, listEvents } from '@polygonlabs/example-client';
import { eventsCollection, createEventStore } from '@polygonlabs/example-db';

import { getEnv } from '../../src/env.ts';
import { createFirestore } from '../../src/firestore.ts';
import { closeAgent, getAgent, isUrlTarget } from './agent.ts';

const CONTRACT = '0x00000000000000000000000000000000000000aa';

// Build a seed row in the storage (snake_case) shape the indexer writes.
function seedEvent(
  overrides: Partial<IndexedEvent> & { block_number: number; log_index: number }
): IndexedEvent {
  return {
    id: `0xtx${overrides.block_number}-${overrides.log_index}`,
    chain: 4927,
    contract_address: CONTRACT,
    event_name: 'Ping',
    tx_hash: `0xtx${overrides.block_number}`,
    args: { sender: '0xsender', seq: String(overrides.block_number) },
    indexed_at: 1700000000000,
    ...overrides
  };
}

beforeAll(async () => {
  const { agent, baseUrl } = getAgent();
  client.setConfig({ baseUrl });
  await agent.get('/health-check').expect(200);
});

afterAll(() => closeAgent());

describe.skipIf(isUrlTarget)('GET /events (in-process): indexed-event read path', () => {
  let db!: Firestore;
  let store!: ReturnType<typeof createEventStore>;
  const network = getEnv().NETWORK;

  beforeAll(() => {
    db = createFirestore();
    store = createEventStore({ db, network });
  });

  // Stateful-store isolation: wipe the events collection before each test.
  beforeEach(async () => {
    await db.recursiveDelete(db.collection(eventsCollection(network)));
  });

  afterAll(async () => {
    await db.terminate();
  });

  it('returns indexed events newest-first with the camelCase API projection', async () => {
    await store.createEvent(seedEvent({ block_number: 10, log_index: 0 }));
    await store.createEvent(seedEvent({ block_number: 11, log_index: 0 }));
    await store.createEvent(seedEvent({ block_number: 12, log_index: 0 }));

    const { data, error } = await listEvents({ query: {} });
    expect(error).toBeUndefined();
    expect(data?.items).length(3);
    // Newest-first.
    expect(data?.items.map((e) => e.blockNumber)).deep.equal([12, 11, 10]);
    // Storage snake_case mapped to the API camelCase projection.
    const [first] = data?.items ?? [];
    expect(first).property('contractAddress', CONTRACT);
    expect(first).property('eventName', 'Ping');
    expect(first).property('txHash', '0xtx12');
    expect(first?.args).deep.equal({ sender: '0xsender', seq: '12' });
  });

  it('filters by eventName', async () => {
    await store.createEvent(seedEvent({ block_number: 20, log_index: 0, event_name: 'Ping' }));
    await store.createEvent(seedEvent({ block_number: 21, log_index: 0, event_name: 'Pong' }));

    const { data, error } = await listEvents({ query: { eventName: 'Pong' } });
    expect(error).toBeUndefined();
    expect(data?.items).length(1);
    expect(data?.items[0]).property('blockNumber', 21);
  });

  it('paginates with an opaque cursor', async () => {
    await store.createEvent(seedEvent({ block_number: 30, log_index: 0 }));
    await store.createEvent(seedEvent({ block_number: 31, log_index: 0 }));
    await store.createEvent(seedEvent({ block_number: 32, log_index: 0 }));

    const firstPage = await listEvents({ query: { limit: 2 } });
    expect(firstPage.error).toBeUndefined();
    expect(firstPage.data?.items.map((e) => e.blockNumber)).deep.equal([32, 31]);
    expect(firstPage.data?.nextCursor).to.be.a('string');

    const nextCursor = firstPage.data?.nextCursor ?? undefined;
    const secondPage = await listEvents({ query: { limit: 2, cursor: nextCursor } });
    expect(secondPage.error).toBeUndefined();
    expect(secondPage.data?.items.map((e) => e.blockNumber)).deep.equal([30]);
    expect(secondPage.data?.nextCursor).to.equal(null);
  });

  it('rejects a malformed cursor with 422', async () => {
    const { error, response } = await listEvents({ query: { cursor: 'not-a-valid-cursor' } });
    expect(response.status).toBe(422);
    expect(error).property('error', true);
  });
});
