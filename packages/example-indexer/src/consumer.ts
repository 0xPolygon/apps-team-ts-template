import type { PublicClient } from 'viem';

import { createPublicClient, http } from 'viem';

import type { CursorStore, EventStore } from '@polygonlabs/example-db';
import type { EventLogs } from '@polygonlabs/viem-event-watcher';

import { streamEvents } from '@polygonlabs/viem-event-watcher';

import type { IndexedEvents } from './config/events.ts';
import type { ConsumerConfig } from './config/types.ts';
import type { Logger } from './logger.ts';

import { mapEventToIndexed } from './mappers/event.ts';

/** Blocks to re-scan before the persisted cursor, to absorb shallow reorgs. */
const REORG_OVERLAP_BLOCKS = 12;
/** Delay before restarting the stream after it ends or throws. */
const RESTART_DELAY_MS = 1_000;

/**
 * Drives `@polygonlabs/viem-event-watcher`'s `streamEvents` to consume a
 * contract's logs and persist them to {@link EventStore}, advancing a per-chain
 * {@link CursorStore} after every scanned batch.
 *
 * The watcher is built entirely on `eth_getLogs` (no filter-based
 * `watchEvent`), so log delivery is consistent on Polygon **bor** — where
 * viem's filter-based watcher silently stops returning tip logs — and any RPC
 * failure surfaces as a thrown error rather than silence. This consumer owns
 * the three things the watcher deliberately doesn't: the cursor, the
 * restart policy, and logging (log once, at the restart boundary).
 */
export class Consumer {
  private readonly client: PublicClient;
  private readonly config: ConsumerConfig<IndexedEvents>;
  private readonly eventStore: EventStore;
  private readonly cursorStore: CursorStore;
  private readonly logger: Logger;

  // Per-attempt abort handle: aborting ends the current stream so the run loop
  // re-enters and resumes from a freshly-read cursor.
  private attempt: AbortController | null = null;
  private stopped = false;

  constructor({
    config,
    eventStore,
    cursorStore,
    logger
  }: {
    config: ConsumerConfig<IndexedEvents>;
    eventStore: EventStore;
    cursorStore: CursorStore;
    logger: Logger;
  }) {
    this.config = config;
    this.eventStore = eventStore;
    this.cursorStore = cursorStore;
    this.logger = logger;
    this.client = createPublicClient({ transport: http(config.rpcUrl) });
  }

  /** Non-blocking: launches the background backfill→live stream loop. */
  public start(): void {
    this.stopped = false;
    void this.runLoop();
  }

  public stop(): void {
    this.stopped = true;
    this.attempt?.abort();
  }

  /**
   * Backfill-and-exit: run a single stream pass from the resume block and
   * return once backfill reaches the tip (the first `live` batch). Used by the
   * e2e suite to index a known set of already-mined events deterministically,
   * without leaving a background poll loop running.
   */
  public async catchUp(): Promise<void> {
    const controller = new AbortController();
    this.attempt = controller;
    const fromBlock = await this.resumeFromBlock();
    await this.consume({ fromBlock, signal: controller.signal, stopAtLive: true });
    controller.abort();
  }

  // Resume from the persisted cursor (minus the reorg overlap), falling back to
  // the configured start block on a cold start.
  private async resumeFromBlock(): Promise<bigint> {
    const lastProcessed = await this.cursorStore.getLastProcessedBlock(this.config.chainId);
    if (lastProcessed > Number(this.config.startBlock)) {
      return BigInt(Math.max(Number(this.config.startBlock), lastProcessed - REORG_OVERLAP_BLOCKS));
    }
    return this.config.startBlock;
  }

  private async runLoop(): Promise<void> {
    while (!this.stopped) {
      const controller = new AbortController();
      this.attempt = controller;
      try {
        const fromBlock = await this.resumeFromBlock();
        await this.consume({ fromBlock, signal: controller.signal, stopAtLive: false });
      } catch (error) {
        // The stream surfaces failures by throwing; log once here (the
        // outermost boundary) and let the loop restart. `warn`, not `error`,
        // because the restart is the recovery — Sentry should not fire.
        this.logger.warn(
          { err: error as Error, chainId: this.config.chainId },
          'consumer error — restarting'
        );
      }
      if (!this.stopped) {
        await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));
      }
    }
  }

  private async consume({
    fromBlock,
    signal,
    stopAtLive
  }: {
    fromBlock: bigint;
    signal: AbortSignal;
    stopAtLive: boolean;
  }): Promise<void> {
    for await (const { phase, logs, toBlock } of streamEvents({
      client: this.client,
      address: this.config.contractAddress,
      events: this.config.events,
      fromBlock,
      batchSize: this.config.batchSize,
      pollingInterval: this.config.pollingInterval,
      signal
    })) {
      await this.onBatch(logs, toBlock);
      if (stopAtLive && phase === 'live') break;
    }
  }

  private async onBatch(logs: EventLogs<IndexedEvents>, toBlock: bigint): Promise<void> {
    for (const event of logs) {
      try {
        const existing = await this.eventStore.findByTxHashAndLogIndex({
          txHash: event.transactionHash,
          logIndex: event.logIndex
        });
        if (existing !== null) {
          this.logger.debug(
            { txHash: event.transactionHash, logIndex: event.logIndex },
            'event already indexed — skipping'
          );
          continue;
        }

        await this.eventStore.createEvent(
          mapEventToIndexed({
            chain: this.config.chainId,
            contractAddress: this.config.contractAddress,
            event,
            indexedAt: Date.now()
          })
        );

        this.logger.info(
          {
            eventName: event.eventName,
            txHash: event.transactionHash,
            logIndex: event.logIndex,
            blockNumber: Number(event.blockNumber),
            chainId: this.config.chainId
          },
          'event indexed'
        );
      } catch (error) {
        // Skip this event but still advance the cursor below, so a single bad
        // log doesn't wedge the stream re-scanning the same range forever.
        this.logger.error(
          { err: error as Error, txHash: event.transactionHash, logIndex: event.logIndex },
          'error processing event'
        );
      }
    }

    // Advance to the scanned high-water-mark — moves the cursor forward even
    // across ranges that produced no matching logs.
    await this.cursorStore.setLastProcessedBlock({
      chainId: this.config.chainId,
      blockNumber: Number(toBlock)
    });
  }
}
