import { JsonRpcProvider, Network } from 'ethers';
import supertest from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createExampleClient } from '@polygonlabs/example-client';

import { getEnv } from '../src/env.ts';
import { createLogger } from '../src/logger.ts';
import { getExpressApp } from '../src/server.ts';

let baseUrl: string;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  if (process.env.TEST_BASE_URL) {
    baseUrl = process.env.TEST_BASE_URL;
    request = supertest(baseUrl);
    return;
  }

  const provider = new JsonRpcProvider(getEnv().RPC_URL, undefined, {
    staticNetwork: Network.from(getEnv().RPC_CHAIN_ID)
  });
  const app = getExpressApp(await createLogger(), provider);
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://localhost:${addr.port}`;
      request = supertest(baseUrl);
      resolve();
    });
    server.on('error', reject);
  });
});

describe('API', () => {
  describe('GET /health-check', () => {
    it('should return success', async () => {
      const result = await createExampleClient(baseUrl).getHealthCheck();
      expect(result.data).property('success', true);
    });
  });

  describe('GET /api/hello', () => {
    it('should return greeting', async () => {
      const result = await createExampleClient(baseUrl).getHello();
      expect(result.data).property('message', 'Hello, world!');
    });
  });

  describe('GET /api/block-number', { timeout: 10000 }, () => {
    it('returns the current block number from the RPC', async () => {
      const result = await createExampleClient(baseUrl).getBlockNumber();
      expect(result.data).property('blockNumber').greaterThan(0);
    });
  });

  describe('GET /api/openapi.json', () => {
    it('should return OpenAPI spec', async () => {
      const { body } = await request.get('/api/openapi.json').expect(200);
      expect(body).property('openapi', '3.0.0');
      expect(body).nested.property('info.title', 'Example REST API');
    });
  });

  describe('unknown routes', () => {
    it('should return 404', async () => {
      await request.get('/nonexistent').expect(404);
    });
  });
});
