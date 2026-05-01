/**
 * Message-related routes — CRUD on the in-memory message store. Exercises
 * body validation, query strings, UUID path params, and a 404 response shape
 * distinct from the 200.
 */

import { z } from 'zod';

import type { OperationsManifest, TypedRegistry } from '@polygonlabs/openapi-registry';

import {
  CreateMessageRequest,
  Message,
  MessageList,
  NotFound,
  RecentMessagesQuery,
  ValidationError
} from '../schemas.ts';

export function addMessageRoutes<Prev extends OperationsManifest>(r: TypedRegistry<Prev>) {
  r.registerPath({
    operationId: 'createMessage',
    method: 'post',
    path: '/api/messages',
    summary: 'Create a message',
    request: {
      body: { content: { 'application/json': { schema: CreateMessageRequest } } }
    },
    responses: {
      200: {
        description: 'Message created',
        content: { 'application/json': { schema: Message } }
      },
      400: {
        description: 'Invalid request',
        content: { 'application/json': { schema: ValidationError } }
      }
    }
  });

  // Mixed cursor (string) + `since` (IsoDateCodec.optional()) query schema.
  // `since` is the request-side codec stress test that doesn't round-trip
  // without the plugin's input transformer: `String(date)` produces the
  // locale string, but the server expects ISO 8601. Registering the
  // wrapping object as `RecentMessagesQuery` lets the plugin emit a
  // runtime-shaped `ListMessagesInput['query']` (so callers pass `Date`)
  // plus an input transformer that runs `IsoDateCodec.encode(date)` to
  // produce `'2026-04-28T13:45:00.000Z'` for the URL.
  r.registerPath({
    operationId: 'listMessages',
    method: 'get',
    path: '/api/messages',
    summary: 'List messages',
    request: {
      query: RecentMessagesQuery
    },
    responses: {
      200: {
        description: 'Page of messages',
        content: { 'application/json': { schema: MessageList } }
      }
    }
  });

  r.registerPath({
    operationId: 'getMessage',
    method: 'get',
    path: '/api/messages/{id}',
    summary: 'Get a message by id',
    request: {
      params: z.object({ id: z.uuid() })
    },
    responses: {
      200: {
        description: 'Message',
        content: { 'application/json': { schema: Message } }
      },
      404: {
        description: 'Not found',
        content: { 'application/json': { schema: NotFound } }
      }
    }
  });

  return r;
}
