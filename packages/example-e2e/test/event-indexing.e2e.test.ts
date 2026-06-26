/**
 * End-to-end proof of the indexer → db flow against a live Polygon **bor**
 * devnet — the chain where viem's filter-based `watchEvent` silently drops tip
 * logs, and exactly where `@polygonlabs/viem-event-watcher`'s `getLogs` polling
 * earns its keep.
 *
 * The flow, with no mocks between the chain and the store:
 *   1. Deploy a minimal event-emitter contract to bor (embedded bytecode).
 *   2. Emit N `Ping(sender, seq)` events (one tx each, seq = 1..N).
 *   3. Point the REAL indexer (`example-indexer`'s `initializeServices`) at the
 *      deployed contract and run its consumer to the chain tip (`catchUp`).
 *   4. Assert example-db's EventStore received EXACTLY those N decoded events,
 *      with the right args, and that the per-chain cursor advanced.
 *
 * This is the e2e tier: it needs the real chain (kurtosis bor) the service
 * can't faithfully stub, so it's opt-in and never runs on every PR.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { initializeServices } from '@polygonlabs/example-indexer/services';
import { createLogger } from '@polygonlabs/logger';

import type { DevnetClients } from '../src/devnet.ts';

import { getDevnetClients, L2_CHAIN_ID, L2_RPC_URL } from '../src/devnet.ts';
import { deployEventEmitter, emitPing } from '../src/event-emitter.ts';
import { clearFirestore, useFirestoreEmulator } from '../src/firestore-emulator.ts';

const EVENT_COUNT = 5;

describe('indexing bor events into example-db (e2e)', { timeout: 120_000 }, () => {
  let clients!: DevnetClients;

  beforeAll(async () => {
    useFirestoreEmulator();
    await clearFirestore();
    clients = getDevnetClients();
  });

  it('indexes exactly the emitted Ping events and advances the cursor', async () => {
    // 1. Deploy the emitter and 2. emit N Pings (seq 1..N), one tx each.
    const { address, deployBlock } = await deployEventEmitter(clients);
    for (let seq = 1; seq <= EVENT_COUNT; seq++) {
      await emitPing({ ...clients, address, seq: BigInt(seq) });
    }

    // 3. Configure the REAL indexer to point at the freshly deployed contract,
    //    backfill from its deploy block, and persist to the same emulator. Env
    //    is read lazily inside initializeServices, so setting it here is enough.
    process.env['RPC_URL'] = L2_RPC_URL;
    process.env['RPC_CHAIN_ID'] = String(L2_CHAIN_ID);
    process.env['CONTRACT_ADDRESS'] = address;
    process.env['START_BLOCK'] = String(deployBlock);
    process.env['BATCH_SIZE'] = '1000';
    process.env['POLLING_INTERVAL_MS'] = '250';
    process.env['NETWORK'] = 'local';

    const logger = await createLogger({ pretty: true });
    const { consumer, eventStore, cursorStore } = initializeServices(logger);

    // Run the indexer's stream from the deploy block to the tip, then stop.
    await consumer.catchUp();

    // 4. Exactly N decoded events landed, with the right args.
    const page = await eventStore.listEvents({
      chain: L2_CHAIN_ID,
      contractAddress: address,
      eventName: 'Ping',
      limit: 100
    });

    expect(page.documents).length(EVENT_COUNT);

    const seqs = page.documents.map((e) => Number(e.args['seq'])).sort((a, b) => a - b);
    expect(seqs).deep.equal([1, 2, 3, 4, 5]);

    // The indexed sender is the admin account that emitted the events.
    const sender = String(page.documents[0]?.args['sender']).toLowerCase();
    expect(sender).equal(clients.account.address.toLowerCase());

    // The cursor advanced at least to the deploy block (high-water-mark).
    const cursor = await cursorStore.getLastProcessedBlock(L2_CHAIN_ID);
    expect(cursor).least(Number(deployBlock));
  });
});
