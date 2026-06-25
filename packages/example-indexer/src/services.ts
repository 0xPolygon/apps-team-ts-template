import { Firestore } from '@google-cloud/firestore';

import type { CursorStore, EventStore } from '@polygonlabs/example-db';

import { createCursorStore, createEventStore } from '@polygonlabs/example-db';

import type { Logger } from './logger.ts';

import { buildConsumerConfig } from './config/events.ts';
import { Consumer } from './consumer.ts';
import { getEnv } from './env.ts';

export interface IndexerServices {
  eventStore: EventStore;
  cursorStore: CursorStore;
  consumer: Consumer;
  chainId: number;
  contractAddress: string;
  network: string;
}

/**
 * Builds the Firestore client, the example-db stores, and the event consumer.
 * Exported (via the package's `./services` entry) so the e2e suite can wire the
 * same stores + consumer the production entry point uses, against the devnet.
 *
 * `universeDomain` is pinned so the gRPC client skips the GCE metadata probe it
 * would otherwise run to discover the domain — that probe fails off-GCP (local
 * + emulator) and emits a noisy MetadataLookupWarning.
 */
export function initializeServices(logger: Logger): IndexerServices {
  const env = getEnv();

  const db = new Firestore({
    projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    universeDomain: 'googleapis.com'
  });
  db.settings({ ignoreUndefinedProperties: true });

  const eventStore = createEventStore({ db, network: env.NETWORK });
  const cursorStore = createCursorStore({ db, network: env.NETWORK });

  const consumer = new Consumer({
    config: buildConsumerConfig(env),
    eventStore,
    cursorStore,
    logger
  });

  return {
    eventStore,
    cursorStore,
    consumer,
    chainId: env.RPC_CHAIN_ID,
    contractAddress: env.CONTRACT_ADDRESS,
    network: env.NETWORK
  };
}
