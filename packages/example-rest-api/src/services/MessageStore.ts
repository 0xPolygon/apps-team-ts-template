import type { z } from 'zod';

import { randomUUID } from 'node:crypto';

import type { Message as MessageSchema } from '@polygonlabs/example-schemas';

type Message = z.output<typeof MessageSchema>;

/**
 * Trivial in-memory message store backing the `/api/messages` routes in the
 * registry-driven Express PoC. Insertion-ordered Map keeps `list()` stable
 * across calls; `reset()` clears state between tests.
 */
export class MessageStore {
  private readonly messages = new Map<string, Message>();
  private readonly defaultLimit = 20;

  create(text: string): Message {
    const message: Message = {
      id: randomUUID(),
      text,
      createdAt: new Date()
    };
    this.messages.set(message.id, message);
    return message;
  }

  get(id: string): Message | null {
    return this.messages.get(id) ?? null;
  }

  /**
   * Cursor-style pagination — `cursor` is the last-seen id from a prior page.
   * Insertion-ordered Map iteration is the natural traversal; the cursor is
   * matched against the keys to advance.
   */
  list({ cursor }: { cursor?: string } = {}): { items: Message[]; nextCursor: string | null } {
    const ids = Array.from(this.messages.keys());
    const startIdx = cursor === undefined ? 0 : ids.indexOf(cursor) + 1;
    const slice = ids.slice(startIdx, startIdx + this.defaultLimit);
    const items = slice
      .map((id) => this.messages.get(id))
      .filter((m): m is Message => m !== undefined);
    const nextCursor = startIdx + this.defaultLimit < ids.length ? slice[slice.length - 1] : null;
    return { items, nextCursor: nextCursor ?? null };
  }

  reset(): void {
    this.messages.clear();
  }
}
