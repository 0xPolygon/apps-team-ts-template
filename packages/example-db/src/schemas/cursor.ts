import { z } from 'zod';

/**
 * Per-chain ingestion cursor — the last block the indexer has fully scanned.
 * Stored one document per chain (doc id = the chain id as a string). The
 * indexer advances this to each scanned batch's high-water-mark, INCLUDING
 * ranges that produced no matching logs, so a restart resumes from where the
 * scan reached rather than from the last event-bearing block.
 */
export const EventCursorSchema = z.object({
  chain_id: z.number(),
  last_processed_block: z.number(),
  /** Unix epoch millis of the last cursor advance. */
  updated_at: z.number()
});

export type EventCursor = z.infer<typeof EventCursorSchema>;
