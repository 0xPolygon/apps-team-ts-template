import type { AbiEvent, Address } from 'viem';

/**
 * Configuration for the event consumer, generic over the ABI event tuple so the
 * decoded log type flows through to the consumer — typed `args` and an
 * `eventName` discriminant, rather than re-deriving event names from topic
 * selectors. Pass `events` as a `readonly` tuple (`as const`) for the inference
 * to hold.
 */
export interface ConsumerConfig<abiEvents extends readonly AbiEvent[]> {
  contractAddress: Address;
  events: abiEvents;
  chainId: number;
  rpcUrl: string;
  /** First block to index from on a cold start. */
  startBlock: bigint;
  /** Block span fetched per `getLogs` call (backfill and live tail). */
  batchSize: bigint;
  /** Live-tail poll interval (ms). */
  pollingInterval: number;
}
