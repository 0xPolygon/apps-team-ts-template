import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createServer as createHttpServer } from 'node:http';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createLogger } from '../src/logger.ts';

const SECRET = 'TEST_SECRET_DO_NOT_LEAK_12345';

/**
 * End-to-end check that an ethers fetch error originating from an RPC call
 * with a `?token=<secret>` query string never reaches the HTTP response body.
 * The sanitisation itself is tested in @polygonlabs/logger and
 * @polygonlabs/express — this test only confirms the template wires the
 * @polygonlabs/express error handler in correctly.
 */
describe('global error handler sanitises ethers fetch errors', () => {
  let rpcServer: Server;
  let appServer: Server;
  let baseUrl: string;

  beforeAll(async () => {
    rpcServer = createHttpServer((_req, res) => {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: -32000, message: 'unauthorized' } }));
    });
    await new Promise<void>((resolve) => rpcServer.listen(0, resolve));
    const rpcPort = (rpcServer.address() as AddressInfo).port;

    // Override env BEFORE importing createServer so the first getEnv() call
    // picks up a URL that embeds the secret token in its query string.
    process.env.RPC_URL = `http://localhost:${rpcPort}/?token=${SECRET}`;
    process.env.RPC_CHAIN_ID = '1';

    const { createServer: createApp } = await import('../src/server.ts');
    const logger = await createLogger();

    const app = createApp(logger);
    appServer = app.listen(0);
    const addr = appServer.address();
    if (!addr || typeof addr === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => appServer.close(() => resolve()));
    await new Promise<void>((resolve) => rpcServer.close(() => resolve()));
  });

  it('response body does not contain the token', async () => {
    const res = await request(baseUrl).get('/api/block-number').expect(500);
    expect(JSON.stringify(res.body)).not.contain(SECRET);
  });

  it('response message preserves the ethers error text but with URLs stripped', async () => {
    const res = await request(baseUrl).get('/api/block-number').expect(500);
    expect(res.body).property('error', true);
    // @polygonlabs/express's createErrorHandler uses the sanitised clone of
    // the original error for the response body — full ethers text minus any
    // URLs. The shape of the text is ethers-version-specific; what we
    // guarantee here is the shortMessage prefix and absence of the token.
    expect(res.body).property('message').a('string');
    expect(res.body.message).contain('401 Unauthorized');
    expect(res.body.message).not.contain(SECRET);
    expect(res.body.message).not.match(/https?:\/\/[^/\s]+\/[^\s)]/);
  });
});
