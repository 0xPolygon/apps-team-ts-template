import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { getExpressApp } from '../src/server.ts';

describe('API', () => {
  const app = getExpressApp();

  describe('GET /health-check', () => {
    it('should return success', async () => {
      const { body } = await supertest(app).get('/health-check').expect(200);
      expect(body).property('success', true);
    });
  });

  describe('GET /api/hello', () => {
    it('should return greeting', async () => {
      const { body } = await supertest(app).get('/api/hello').expect(200);
      expect(body).property('message', 'Hello, world!');
    });
  });

  describe('GET /api/openapi.json', () => {
    it('should return OpenAPI spec', async () => {
      const { body } = await supertest(app).get('/api/openapi.json').expect(200);
      expect(body).property('openapi', '3.0.0');
      expect(body).nested.property('info.title', 'Example REST API');
    });
  });

  describe('unknown routes', () => {
    it('should return 404', async () => {
      await supertest(app).get('/nonexistent').expect(404);
    });
  });
});
