/**
 * Message-related handlers backed by an in-memory MessageStore. Demonstrates:
 *   - body validation feeding decoded `req.body` into a typed handler,
 *   - path-param validation (UUID) feeding decoded `req.params.id`,
 *   - a 404 response shape distinct from the 200 shape — `res.status(404)`
 *     causes the response validator to encode against the 404 schema.
 */

import type { buildRegistry } from '@polygonlabs/example-schemas';
import type { HandlerMapFor } from '@polygonlabs/express/registry';

import type { MessageStore } from '../services/MessageStore.ts';

export const buildMessageHandlers = (store: MessageStore) =>
  ({
    createMessage: (req, res) => {
      const message = store.create(req.body.text);
      res.json(message);
    },

    listMessages: (req, res) => {
      const page = store.list({ cursor: req.query.cursor });
      res.json(page);
    },

    getMessage: (req, res) => {
      const message = store.get(req.params.id);
      if (message === null) {
        res.status(404).json({ error: true, message: `Message ${req.params.id} not found` });
        return;
      }
      res.json(message);
    }
  }) satisfies Partial<HandlerMapFor<typeof buildRegistry>>;
