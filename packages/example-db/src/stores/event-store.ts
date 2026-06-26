import type { CollectionReference, Firestore, Query } from '@google-cloud/firestore';

import type { EventStore, EventsCursor, ListEventsParams, PaginatedResult } from '../interfaces.ts';
import type { IndexedEvent } from '../schemas/event.ts';

import { eventsCollection } from '../constants.ts';
import { IndexedEventSchema } from '../schemas/event.ts';
import { zodConverter } from './converter.ts';

async function findByTxHashAndLogIndex(
  col: CollectionReference<IndexedEvent>,
  { txHash, logIndex }: { txHash: string; logIndex: number }
): Promise<IndexedEvent | null> {
  const snap = await col
    .where('tx_hash', '==', txHash)
    .where('log_index', '==', logIndex)
    .limit(1)
    .get();
  return snap.docs[0]?.data() ?? null;
}

async function createEvent(
  col: CollectionReference<IndexedEvent>,
  event: IndexedEvent
): Promise<void> {
  // Keyed by the deterministic `${tx_hash}-${log_index}` id, so a re-scan of an
  // already-indexed range overwrites the same row rather than duplicating it —
  // idempotent on top of the indexer's explicit dedup check.
  await col.doc(event.id).set(event);
}

async function listEvents(
  col: CollectionReference<IndexedEvent>,
  params: ListEventsParams
): Promise<PaginatedResult<IndexedEvent, EventsCursor>> {
  let q: Query<IndexedEvent> = col;

  if (params.chain !== undefined) {
    q = q.where('chain', '==', params.chain);
  }
  if (params.contractAddress !== undefined) {
    q = q.where('contract_address', '==', params.contractAddress.toLowerCase());
  }
  if (params.eventName !== undefined) {
    q = q.where('event_name', '==', params.eventName);
  }

  // Newest-first, with the document id as a stable tiebreak so the cursor is
  // total-ordered even when several logs share a block.
  q = q.orderBy('block_number', 'desc').orderBy('__name__', 'desc');

  if (params.cursor !== undefined) {
    q = q.startAfter(params.cursor.blockNumber, col.doc(params.cursor.id));
  }

  // Fetch one extra row to detect a next page without a separate count() query
  // (Firestore bills count() separately and the total isn't needed here).
  const snap = await q.limit(params.limit + 1).get();
  const hasMore = snap.docs.length > params.limit;
  const documents = snap.docs.slice(0, params.limit).map((d) => d.data());
  const last = documents[documents.length - 1];
  const nextCursor: EventsCursor | null =
    hasMore && last !== undefined ? { blockNumber: last.block_number, id: last.id } : null;

  return { documents, nextCursor };
}

/**
 * Builds an {@link EventStore} bound to the `example_events_<network>`
 * collection. The Zod converter parses every read at the boundary, so callers
 * receive validated {@link IndexedEvent}s.
 */
export function createEventStore({ db, network }: { db: Firestore; network: string }): EventStore {
  const col = db
    .collection(eventsCollection(network))
    .withConverter(zodConverter(IndexedEventSchema));
  return {
    createEvent: (event) => createEvent(col, event),
    findByTxHashAndLogIndex: (params) => findByTxHashAndLogIndex(col, params),
    listEvents: (params) => listEvents(col, params)
  };
}
