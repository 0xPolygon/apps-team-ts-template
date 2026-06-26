import type { Firestore } from '@google-cloud/firestore';

import type { CursorStore } from '../interfaces.ts';

import { cursorsCollection } from '../constants.ts';
import { EventCursorSchema } from '../schemas/cursor.ts';
import { zodConverter } from './converter.ts';

/**
 * Builds a {@link CursorStore} bound to the `example_cursors_<network>`
 * collection, one document per chain (doc id = the chain id as a string).
 */
export function createCursorStore({
  db,
  network
}: {
  db: Firestore;
  network: string;
}): CursorStore {
  const col = db
    .collection(cursorsCollection(network))
    .withConverter(zodConverter(EventCursorSchema));

  return {
    getLastProcessedBlock: async (chainId) => {
      const snap = await col.doc(String(chainId)).get();
      return snap.data()?.last_processed_block ?? 0;
    },

    setLastProcessedBlock: async ({ chainId, blockNumber }) => {
      await col.doc(String(chainId)).set({
        chain_id: chainId,
        last_processed_block: blockNumber,
        updated_at: Date.now()
      });
    }
  };
}
