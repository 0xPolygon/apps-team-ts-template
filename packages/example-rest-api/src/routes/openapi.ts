import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi
} from '@asteasolutions/zod-to-openapi';
import { apiReference } from '@scalar/express-api-reference';
import { Router } from 'express';
import { z } from 'zod';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'get',
  path: '/health-check',
  summary: 'Liveness check',
  responses: {
    200: {
      description: 'Service is alive',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }).openapi('HealthCheckResponse')
        }
      }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/hello',
  summary: 'Hello world',
  responses: {
    200: {
      description: 'Greeting response',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }).openapi('HelloResponse')
        }
      }
    }
  }
});

const spec = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Example REST API',
    version: '0.0.0',
    description: 'Stubbed REST API with OpenAPI documentation'
  },
  servers: [{ url: '/' }]
});

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(spec);
});

router.use('/docs', apiReference({ content: spec }));

export { router as openApiRouter };
