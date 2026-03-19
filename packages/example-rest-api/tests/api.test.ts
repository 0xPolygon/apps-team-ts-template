import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { getExpressApp } from '../src/server.ts';

// When TEST_BASE_URL is set the same suite runs against a deployed Docker
// container; otherwise it runs against the local Express app directly.
const request = process.env.TEST_BASE_URL
  ? supertest(process.env.TEST_BASE_URL)
  : supertest(getExpressApp());

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
