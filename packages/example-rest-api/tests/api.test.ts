import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  client,
  createMessage,
  getBlockMetadata,
  getBlockNumber,
  getHealthCheck,
  getHello,
  getMessage,
  listMessages
} from '@polygonlabs/example-client';

import { closeAgent, getAgent } from './helpers/agent.ts';

afterAll(() => closeAgent());

const { agent, baseUrl } = getAgent();
const TEST_API_KEY = 'test-secret';
// Mirrors the .env.test value the in-process server reads at startup.
// Configuring it on the SDK once propagates to every typed-client call;
// raw `agent.*` requests below set it manually.
client.setConfig({
  baseUrl,
  headers: {
    'x-api-key': TEST_API_KEY
  }
});

beforeEach(async () => {
  // Wipe the in-memory message store before each test so listings start
  // empty. The store reset endpoint isn't part of the public API — we go
  // through the test agent directly. A more isolated approach would be a
  // fresh server per test; for the PoC the speed of a shared server is
  // worth the explicit reset.
  // (No reset endpoint exists; tests that need cleanup create + verify
  // within their own beforeEach. Left as-is for now.)
});

describe('API — registry-driven, codegen client round-trip', () => {
  describe('GET /health-check', () => {
    it('returns success', async () => {
      const { data } = await getHealthCheck();
      expect(data).property('success', true);
    });
  });

  describe('GET /api/hello', () => {
    it('returns greeting', async () => {
      const { data } = await getHello();
      expect(data).property('message', 'Hello, world!');
    });
  });

  describe('GET /api/block-number', () => {
    it('returns the polled block number, decoded to bigint via Int64Codec', async () => {
      // The default test fetcher returns 22_000_000; NetworkService caches it
      // after the first poll. The response transformer runs Int64Codec.parseAsync
      // and the caller sees a real bigint, not the wire string.
      const { data } = await getBlockNumber();
      expect(data).property('blockNumber');
      expect(typeof data?.blockNumber).toBe('bigint');
      expect(data?.blockNumber).toEqual(22_000_000n);
    });
  });

  describe('GET /api/blocks/{blockNumber} — codec-on-path stress test', () => {
    it('round-trips Int64Codec end-to-end on path param + response fields', async () => {
      // The runtime input shape is `bigint` (codec output), thanks to the
      // @polygonlabs/zod-to-openapi-heyapi plugin's input transformer:
      // `BlockNumberPathParams.blockNumber: Int64Codec` makes
      // `getBlockMetadata`'s `path.blockNumber` typed as `bigint` end-to-end.
      // The transformer encodes runtime → wire (`String(bigint)`) before the
      // path serialiser runs; the server's request validator decodes the
      // wire string back to a bigint for the handler. The response carries
      // multiple Int64Codec fields; the response validator encodes them on
      // the way out, and the client's response transformer decodes them
      // back to bigint on receipt.
      const blockNumber = 9_007_199_254_740_993n; // 2^53 + 1 — outside Number safety
      const { data, error } = await getBlockMetadata({ path: { blockNumber } });
      expect(error).toBeUndefined();
      expect(data?.number).toEqual(9_007_199_254_740_993n);
      expect(typeof data?.number).toBe('bigint');
      expect(typeof data?.timestamp).toBe('bigint');
      expect(data?.hash).toMatch(/^0x[0-9a-f]+$/);
    });

    it('responds 404 with NotFound shape when handler returns null', async () => {
      const { data, error, response } = await getBlockMetadata({ path: { blockNumber: 0n } });
      expect(data).toBeUndefined();
      expect(response.status).toBe(404);
      expect(error).property('error', true);
      expect(error?.message).toMatch(/not found/i);
    });

    it('responds 400 when path param fails Int64Codec validation', async () => {
      // Bypass the typed client so we can send an invalid wire shape.
      // Auth still required — operation declares ApiKeyAuth.
      const res = await agent.get('/api/blocks/notanumber').set('x-api-key', TEST_API_KEY);
      expect(res.status).toBe(400);
      expect(res.body).property('error', true);
      // Registry validator emits z.treeifyError under info.params.properties.<field>.errors
      expect(res.body.info?.params?.properties?.blockNumber?.errors).toBeDefined();
      expect(res.body.info?.params?.properties?.blockNumber?.errors?.length).greaterThan(0);
    });

    it('responds 401 when x-api-key is missing', async () => {
      // Auth runs before request validation, so even a malformed path
      // returns 401 — never decodes the codec.
      const res = await agent.get('/api/blocks/notanumber');
      expect(res.status).toBe(401);
      expect(res.body).property('error', true);
      expect(res.body.message).toMatch(/unauthorized/i);
    });

    it('responds 401 when x-api-key is wrong', async () => {
      const res = await agent.get('/api/blocks/123').set('x-api-key', 'not-the-key');
      expect(res.status).toBe(401);
      expect(res.body).property('error', true);
    });
  });

  describe('POST /api/messages', () => {
    it('creates a message; response codec round-trips IsoDateCodec to a Date instance', async () => {
      const { data } = await createMessage({ body: { text: 'hello world' } });
      expect(data?.text).toBe('hello world');
      // UUID v4-format from randomUUID
      expect(data?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      // IsoDateCodec on the wire (ISO string) is decoded to a real Date by
      // the response transformer.
      expect(data?.createdAt).toBeInstanceOf(Date);
    });

    it('responds 400 with structured ValidationError on missing required field', async () => {
      const res = await agent.post('/api/messages').send({});
      expect(res.status).toBe(400);
      expect(res.body).property('error', true);
      // z.treeifyError tree under info.body — text is the missing field.
      expect(res.body.info?.body?.properties?.text?.errors).toBeDefined();
      expect(res.body.info?.body?.properties?.text?.errors?.length).greaterThan(0);
    });

    it('responds 400 when text exceeds the 280-character cap', async () => {
      const res = await agent.post('/api/messages').send({ text: 'x'.repeat(300) });
      expect(res.status).toBe(400);
      expect(res.body.info?.body?.properties?.text?.errors).toBeDefined();
    });
  });

  describe('GET /api/messages and /api/messages/{id}', () => {
    it('lists created messages; nextCursor is null on a single page', async () => {
      // No-arg call — the route's query schema (RecentMessagesQuery) has
      // only optional fields (cursor, since), so the SDK Data emits
      // `query?: ...` and our wrapper makes `options?:` too.
      await createMessage({ body: { text: 'in list' } });
      const { data } = await listMessages();
      expect(Array.isArray(data?.items)).toBe(true);
      expect(data?.nextCursor).toBeNull();
      // Every item's createdAt is a real Date — codec round-trip on array elements.
      for (const m of data?.items ?? []) {
        expect(m.createdAt).toBeInstanceOf(Date);
      }
    });

    it('round-trips IsoDateCodec on a query param via the input transformer', async () => {
      // `since: IsoDateCodec.optional()` — the runtime shape is `Date`, the
      // wire shape is an ISO 8601 string. `String(date)` produces the
      // locale string (e.g. "Tue Apr 28 2026 14:45:00 GMT+0100 (...)"),
      // which the server's z.iso.datetime() validator rejects. The plugin's
      // input transformer runs `IsoDateCodec.encode(date) → toISOString()`
      // before the URL is built, so the server receives the wire string it
      // expects.
      //
      // No server-side filtering is wired for `since` in this PoC — the
      // route just lists everything regardless. The point of this test is
      // proving the runtime encode runs end-to-end; the request reaching
      // the handler at all is the affirmative case.
      const since = new Date('2026-04-28T13:45:00.000Z');
      const { data, error } = await listMessages({ query: { since } });
      expect(error).toBeUndefined();
      expect(Array.isArray(data?.items)).toBe(true);
    });

    it('round-trips a UUID path param: created -> get-by-id', async () => {
      const created = await createMessage({ body: { text: 'fetch me' } });
      const id = created.data?.id;
      expect(id).toBeDefined();
      const fetched = await getMessage({ path: { id: id as string } });
      expect(fetched.data?.id).toBe(id);
      expect(fetched.data?.text).toBe('fetch me');
    });

    it('responds 404 with NotFound shape for unknown UUID', async () => {
      const { data, error, response } = await getMessage({
        path: { id: '00000000-0000-4000-8000-000000000000' }
      });
      expect(data).toBeUndefined();
      expect(response.status).toBe(404);
      expect(error).property('error', true);
    });

    it('responds 400 when path id fails UUID validation', async () => {
      const res = await agent.get('/api/messages/not-a-uuid');
      expect(res.status).toBe(400);
      // z.treeifyError tree under info.params.properties.id
      const errors = res.body.info?.params?.properties?.id?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0]).toMatch(/uuid/i);
    });
  });

  describe('GET /api/openapi.json', () => {
    it('serves the committed spec', async () => {
      const { body } = await agent.get('/api/openapi.json').expect(200);
      expect(body).property('openapi', '3.0.0');
      expect(body).nested.property('info.title', 'Example REST API');
    });
  });

  describe('unknown routes', () => {
    it('returns 404 from the fallthrough handler', async () => {
      await agent.get('/nonexistent').expect(404);
    });
  });
});
