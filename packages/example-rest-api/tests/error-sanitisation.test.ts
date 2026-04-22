import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createServer as createHttpServer } from 'node:http';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Logger } from '../src/logger.ts';

const SECRET = 'TEST_SECRET_DO_NOT_LEAK_12345';

interface Captured {
  level: string;
  obj: unknown;
  msg: unknown;
}

function makeCaptureLogger(): { logger: Logger; captured: Captured[] } {
  const captured: Captured[] = [];
  const record =
    (level: string) =>
    (obj: unknown, msg?: unknown): void => {
      captured.push({ level, obj, msg });
    };
  const log = {
    trace: record('trace'),
    debug: record('debug'),
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    fatal: record('fatal'),
    child() {
      return log;
    }
  };
  return { logger: log as unknown as Logger, captured };
}

describe('global error handler sanitises ethers fetch errors', () => {
  let rpcServer: Server;
  let rpcPort: number;
  let appServer: Server;
  let baseUrl: string;
  let captured: Captured[];

  beforeAll(async () => {
    rpcServer = createHttpServer((_req, res) => {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: -32000, message: 'unauthorized' } }));
    });
    await new Promise<void>((resolve) => rpcServer.listen(0, resolve));
    rpcPort = (rpcServer.address() as AddressInfo).port;

    // Override env BEFORE importing createServer so the first getEnv() call
    // picks up a URL that embeds the secret token in its query string.
    process.env.RPC_URL = `http://localhost:${rpcPort}/?token=${SECRET}`;
    process.env.RPC_CHAIN_ID = '1';

    const { createServer: createApp } = await import('../src/server.ts');
    const capture = makeCaptureLogger();
    captured = capture.captured;

    const app = createApp(capture.logger);
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

  it('response message is the ethers shortMessage, not the leaky full message', async () => {
    const res = await request(baseUrl).get('/api/block-number').expect(500);
    expect(res.body).property('error', true);
    expect(res.body).property('message', 'server response 401 Unauthorized');
  });

  it('captured logs do not contain the token', () => {
    expect(JSON.stringify(captured)).not.contain(SECRET);
  });

  it('captured log err.info.requestUrl is reduced to origin, not full URL', () => {
    const errLogs = captured.filter((c) => c.level === 'debug' && c.msg === 'unhandled error');
    expect(errLogs).property('length').greaterThan(0);
    const firstErr = errLogs[0]?.obj as { err?: { info?: { requestUrl?: string } } };
    const loggedUrl = firstErr?.err?.info?.requestUrl;
    expect(loggedUrl).equal(`http://localhost:${rpcPort}`);
  });
});
