import type { IndexedEvent } from './schemas/event.ts';

/**
 * Opaque pagination cursor for the indexed-event list query. Captures the
 * `ORDER BY (block_number DESC, __name__ DESC)` key tuple so a follow-up page
 * resumes exactly after the last row of the previous one.
 */
export interface EventsCursor {
  blockNumber: number;
  id: string;
}

/**
 * Filters for {@link EventStore.listEvents}. All filters are optional; omit
 * them all to page the whole collection newest-first. Each filter that is set
 * narrows the query with an equality match.
 */
export interface ListEventsParams {
  chain?: number;
  contractAddress?: string;
  eventName?: string;
  limit: number;
  cursor?: EventsCursor;
}

export interface PaginatedResult<T, C> {
  documents: T[];
  /** `null` when this is the last page. */
  nextCursor: C | null;
}

/**
 * Read/write surface over the decoded-event collection. The indexer writes
 * (`createEvent`, with `findByTxHashAndLogIndex` for dedup); the REST API reads
 * (`listEvents`).
 */
export interface EventStore {
  createEvent(event: IndexedEvent): Promise<void>;

  /** Dedup check: returns the event matching this tx hash + log index, or null. */
  findByTxHashAndLogIndex(params: {
    txHash: string;
    logIndex: number;
  }): Promise<IndexedEvent | null>;

  /** Paginated, newest-first list with optional equality filters. */
  listEvents(params: ListEventsParams): Promise<PaginatedResult<IndexedEvent, EventsCursor>>;
}

/**
 * Per-chain ingestion cursor. The indexer reads the resume point on (re)start
 * and advances it after every scanned batch.
 */
export interface CursorStore {
  /** Last fully-scanned block for the chain, or 0 if none recorded yet. */
  getLastProcessedBlock(chainId: number): Promise<number>;
  setLastProcessedBlock(params: { chainId: number; blockNumber: number }): Promise<void>;
}
