import type { Firestore } from '@google-cloud/firestore';
import type { z } from 'zod';

import { Widget as WidgetSchema } from '@polygonlabs/example-schemas';

type Widget = z.output<typeof WidgetSchema>;

const COLLECTION = 'widgets';

// Firestore stores everything but the document id. The id is the doc key, so
// it's reattached on read rather than duplicated in the document body. Reads
// come back as `unknown` (a trust boundary), so they're validated with Zod
// rather than cast — a malformed doc fails loudly here, not three frames
// later. See team standards: "narrow unknown by validating, not casting".
const StoredWidget = WidgetSchema.omit({ id: true });

/**
 * Firestore-backed CRUD for widgets — the source of truth behind the
 * cache-aside read path. Kept to the operations the example exercises:
 * `get`, `put`, `delete`, and `clear` (the test-isolation helper).
 */
export class WidgetStore {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async get(id: string): Promise<Widget | null> {
    const snap = await this.db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    const { name } = StoredWidget.parse(snap.data());
    return { id, name };
  }

  async put(widget: Widget): Promise<void> {
    const { id, ...rest } = widget;
    await this.db.collection(COLLECTION).doc(id).set(rest);
  }

  async delete(id: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).delete();
  }

  /**
   * Deletes every document in the collection. The integration suite calls
   * this in `beforeEach` so tests are order-independent — the most-missed
   * part of stateful integration testing, and the thing a cache (Redis)
   * never forces you to handle. `recursiveDelete` is a Firestore Admin SDK
   * primitive; it's available against the emulator just as in production.
   */
  async clear(): Promise<void> {
    await this.db.recursiveDelete(this.db.collection(COLLECTION));
  }
}
