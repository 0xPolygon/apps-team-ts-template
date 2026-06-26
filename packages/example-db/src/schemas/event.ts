import { z } from 'zod';

/**
 * A single decoded on-chain log, persisted by `example-indexer` and read back
 * by `example-rest-api`. The shape is storage-facing (snake_case, JSON-safe
 * primitives) rather than a mirror of viem's `Log` — `bigint` block numbers and
 * event args are narrowed to `number`/`string` here because Firestore has no
 * bigint type and the REST surface serialises to JSON.
 *
 * `args` is a flat record of the event's decoded parameters. The indexer
 * stringifies `bigint` values and drops viem's positional (numeric-key)
 * duplicates before writing, so every value is a JSON primitive — see
 * `example-indexer`'s event mapper.
 */
export const IndexedEventSchema = z.object({
  /** `${tx_hash}-${log_index}` — unique per emitted log, used as the doc id. */
  id: z.string(),
  chain: z.number(),
  contract_address: z.string(),
  event_name: z.string(),
  block_number: z.number(),
  transaction_index: z.number().optional(),
  tx_hash: z.string(),
  log_index: z.number(),
  args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  /** Unix epoch millis when the indexer wrote the row. */
  indexed_at: z.number()
});

export type IndexedEvent = z.infer<typeof IndexedEventSchema>;
