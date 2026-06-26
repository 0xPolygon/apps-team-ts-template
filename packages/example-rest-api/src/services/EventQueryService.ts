import { z } from 'zod';

import type {
  EventStore,
  EventsCursor,
  IndexedEvent as DbIndexedEvent
} from '@polygonlabs/example-db';
import type {
  EventList as EventListSchema,
  IndexedEvent as IndexedEventSchema
} from '@polygonlabs/example-schemas';

import { Unprocessable } from '@polygonlabs/verror';

type ApiEvent = z.output<typeof IndexedEventSchema>;
type EventList = z.output<typeof EventListSchema>;

// The opaque `nextCursor` the API hands clients is a base64url-encoded
// `{ blockNumber, id }` — the store's internal cursor tuple. Encoding it keeps
// the wire contract opaque (clients pass it back verbatim) while the store
// stays free to change its key tuple without a breaking API change.
const CursorSchema = z.object({ blockNumber: z.number(), id: z.string() });

function encodeCursor(cursor: EventsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

// A malformed cursor is a well-formed string (so it passes query validation,
// which can't decode it) that is semantically unusable — hence 422
// Unprocessable, not 400. A 400 here would also collide with the
// ValidationErrorResponse the registry auto-injects for `request.query`.
function decodeCursor(raw: string): EventsCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new Unprocessable('Invalid pagination cursor');
  }
  const result = CursorSchema.safeParse(parsed);
  if (!result.success) {
    throw new Unprocessable('Invalid pagination cursor');
  }
  return result.data;
}

// Project the storage-facing (snake_case) row onto the API shape (camelCase).
// Keeping the mapping here is the point: the DB schema and the API schema are
// independent contracts, and this is the single seam between them.
function toApiEvent(event: DbIndexedEvent): ApiEvent {
  return {
    id: event.id,
    chain: event.chain,
    contractAddress: event.contract_address,
    eventName: event.event_name,
    blockNumber: event.block_number,
    transactionIndex: event.transaction_index,
    txHash: event.tx_hash,
    logIndex: event.log_index,
    args: event.args,
    indexedAt: event.indexed_at
  };
}

const DEFAULT_LIMIT = 20;

/**
 * Read-only query surface over `example-db`'s `EventStore` for `GET /events`.
 * Translates between the API's opaque string cursor and the store's internal
 * cursor tuple, and between the API (camelCase) and storage (snake_case) event
 * shapes.
 */
export class EventQueryService {
  private readonly store: EventStore;

  constructor({ store }: { store: EventStore }) {
    this.store = store;
  }

  async list(params: {
    chain?: number;
    contractAddress?: string;
    eventName?: string;
    cursor?: string;
    limit?: number;
  }): Promise<EventList> {
    const page = await this.store.listEvents({
      chain: params.chain,
      contractAddress: params.contractAddress,
      eventName: params.eventName,
      limit: params.limit ?? DEFAULT_LIMIT,
      cursor: params.cursor !== undefined ? decodeCursor(params.cursor) : undefined
    });

    return {
      items: page.documents.map(toApiEvent),
      nextCursor: page.nextCursor === null ? null : encodeCursor(page.nextCursor)
    };
  }
}
