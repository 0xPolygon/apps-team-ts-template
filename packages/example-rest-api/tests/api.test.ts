import { JsonRpcProvider, Network } from 'ethers';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { getEnv } from '../src/env.ts';
import { createLogger } from '../src/logger.ts';
import { getExpressApp } from '../src/server.ts';

// When TEST_BASE_URL is set the same suite runs against a deployed Docker
// container; otherwise it runs against the local Express app directly.
//
// The provider uses staticNetwork so no eth_chainId detection call is made
// on startup and no background timer is held — the test process exits cleanly.
const provider = new JsonRpcProvider(getEnv().RPC_URL, undefined, {
  staticNetwork: Network.from(getEnv().RPC_CHAIN_ID)
});
const request = process.env.TEST_BASE_URL
  ? supertest(process.env.TEST_BASE_URL)
  : supertest(getExpressApp(await createLogger(), provider));

describe('API', () => {
  describe('GET /health-check', () => {
    it('should return success', async () => {
      const { body } = await request.get('/health-check').expect(200);
      expect(body).property('success', true);
    });
  });

  describe('GET /api/hello', () => {
    it('should return greeting', async () => {
      const { body } = await request.get('/api/hello').expect(200);
      expect(body).property('message', 'Hello, world!');
    });
  });

  describe('GET /api/block-number', { timeout: 10000 }, () => {
    it('returns the current block number from the RPC', async () => {
      const { body } = await request.get('/api/block-number').expect(200);
      expect(body).property('blockNumber').greaterThan(0);
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
