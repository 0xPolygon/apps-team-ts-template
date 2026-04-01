import { afterAll, describe, expect, it } from 'vitest';

import { createExampleClient } from '@polygonlabs/example-client';

import { closeAgent, getAgent } from './helpers/agent.ts';

afterAll(() => closeAgent());

const { agent, baseUrl } = getAgent();
const client = createExampleClient(baseUrl);

describe('API', () => {
  describe('GET /health-check', () => {
    it('should return success', async () => {
      const result = await client.getHealthCheck();
      expect(result.data).property('success', true);
    });
  });

  describe('GET /api/hello', () => {
    it('should return greeting', async () => {
      const result = await client.getHello();
      expect(result.data).property('message', 'Hello, world!');
    });
  });

  describe('GET /api/block-number', { timeout: 10000 }, () => {
    it('returns the current block number from the RPC', async () => {
      const result = await client.getBlockNumber();
      expect(result.data).property('blockNumber').greaterThan(0);
    });
  });

  describe('GET /api/openapi.json', () => {
    it('should return OpenAPI spec', async () => {
      const { body } = await agent.get('/api/openapi.json').expect(200);
      expect(body).property('openapi', '3.0.0');
      expect(body).nested.property('info.title', 'Example REST API');
    });
  });

  describe('unknown routes', () => {
    it('should return 404', async () => {
      await agent.get('/nonexistent').expect(404);
    });
  });
});
