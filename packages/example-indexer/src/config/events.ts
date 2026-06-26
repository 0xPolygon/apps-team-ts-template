import { parseAbiItem } from 'viem';

import type { Env } from '../env.ts';
import type { ConsumerConfig } from './types.ts';

/**
 * The event(s) this indexer ingests. Declared as a `readonly` tuple via
 * `as const` so viem infers a precise type from each signature string: the
 * decoded logs carry a typed `eventName` discriminant and typed `args`
 * (`{ sender: Address; seq: bigint }` for `Ping`) all the way into the
 * consumer, with no topic-selector lookup.
 *
 * `Ping` is the demo contract's only event — an indexed `sender` (a log topic)
 * plus a non-indexed `seq` (log data) — chosen to exercise both decode paths.
 * Swap these signatures (and `CONTRACT_ADDRESS`) to point the indexer at a real
 * contract.
 */
export const indexedEvents = [
  parseAbiItem('event Ping(address indexed sender, uint256 seq)')
] as const;

export type IndexedEvents = typeof indexedEvents;

/**
 * Assembles the {@link ConsumerConfig} from validated env. Kept separate from
 * env parsing so tests (and the e2e suite) can build a config against an
 * arbitrary address/chain without booting the whole service.
 */
export function buildConsumerConfig(env: Env): ConsumerConfig<IndexedEvents> {
  return {
    contractAddress: env.CONTRACT_ADDRESS,
    events: indexedEvents,
    chainId: env.RPC_CHAIN_ID,
    rpcUrl: env.RPC_URL,
    startBlock: BigInt(env.START_BLOCK),
    batchSize: BigInt(env.BATCH_SIZE),
    pollingInterval: env.POLLING_INTERVAL_MS
  };
}
