import type { AbiEvent } from 'viem';

import type { IndexedEvent } from '@polygonlabs/example-db';
import type { EventLogs } from '@polygonlabs/viem-event-watcher';

/**
 * Maps a decoded viem log to a storage-facing {@link IndexedEvent}. Two
 * normalisations make the row JSON-safe for Firestore: `bigint` args are
 * stringified, and viem's positional (numeric-key) arg duplicates are dropped
 * so `args` holds only the named parameters.
 */
export function mapEventToIndexed<abiEvents extends readonly AbiEvent[]>({
  chain,
  contractAddress,
  event,
  indexedAt
}: {
  chain: number;
  contractAddress: string;
  event: EventLogs<abiEvents>[number];
  indexedAt: number;
}): IndexedEvent {
  // Parameterless events decode to an empty args object; default to {} so they
  // are still recorded with an empty `args`.
  const rawArgs: Record<string, unknown> = { ...event.args };
  const args: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(rawArgs)) {
    // Drop viem's positional duplicates (numeric keys) — keep named params.
    if (/^\d+$/.test(key)) continue;
    if (typeof value === 'bigint') {
      args[key] = value.toString();
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      args[key] = value;
    }
  }

  return {
    id: `${event.transactionHash}-${event.logIndex}`,
    chain,
    contract_address: contractAddress.toLowerCase(),
    event_name: event.eventName,
    block_number: Number(event.blockNumber),
    transaction_index: event.transactionIndex,
    tx_hash: event.transactionHash,
    log_index: event.logIndex,
    args,
    indexed_at: indexedAt
  };
}
