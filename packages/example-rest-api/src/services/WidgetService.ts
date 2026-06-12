import type { z } from 'zod';

import { Widget as WidgetSchema } from '@polygonlabs/example-schemas';

import type { Logger } from '../logger.ts';
import type { RedisClient } from '../redis.ts';
import type { WidgetStore } from './WidgetStore.ts';

type Widget = z.output<typeof WidgetSchema>;

const cacheKey = (id: string) => `widget:${id}`;

/**
 * Cache-aside read of a widget: check Redis first; on a miss, read Firestore
 * (the source of truth) and populate the cache for next time. This is the
 * canonical cache-aside pattern — the cache is a lookaside copy, never the
 * authority, so a cold cache is correct (just slower) and a stale entry is
 * bounded by the TTL.
 */
export class WidgetService {
  private readonly store: WidgetStore;
  private readonly cache: RedisClient;
  private readonly ttlSeconds: number;
  private readonly logger: Logger;

  constructor({
    store,
    cache,
    logger,
    ttlSeconds = 60
  }: {
    store: WidgetStore;
    cache: RedisClient;
    logger: Logger;
    ttlSeconds?: number;
  }) {
    this.store = store;
    this.cache = cache;
    this.logger = logger;
    this.ttlSeconds = ttlSeconds;
  }

  async getById(id: string): Promise<Widget | null> {
    const cached = await this.cache.get(cacheKey(id));
    if (cached !== null) {
      // Cached payload is `unknown` once parsed — validate before trusting
      // it (a schema change could leave stale, now-invalid shapes in Redis).
      this.logger.debug({ id }, 'widget cache hit');
      return WidgetSchema.parse(JSON.parse(cached));
    }

    const widget = await this.store.get(id);
    if (widget === null) return null;

    this.logger.debug({ id }, 'widget cache miss — populating from Firestore');
    await this.cache.set(cacheKey(id), JSON.stringify(widget), this.ttlSeconds);
    return widget;
  }

  /** Closes the underlying Redis connection — called on server shutdown. */
  async close(): Promise<void> {
    await this.cache.quit();
  }
}
