import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  BlockNumberResponseSchema,
  HealthCheckResponseSchema,
  HelloResponseSchema
} from './schemas.ts';

export function buildRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  registry.registerPath({
    method: 'get',
    path: '/health-check',
    operationId: 'getHealthCheck',
    summary: 'Liveness check',
    responses: {
      200: {
        description: 'Service is alive',
        content: { 'application/json': { schema: HealthCheckResponseSchema } }
      }
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/hello',
    operationId: 'getHello',
    summary: 'Hello world',
    responses: {
      200: {
        description: 'Greeting response',
        content: { 'application/json': { schema: HelloResponseSchema } }
      }
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/block-number',
    operationId: 'getBlockNumber',
    summary: 'Current block number',
    description: 'Returns the latest block number from the configured RPC endpoint.',
    responses: {
      200: {
        description: 'Latest block number',
        content: { 'application/json': { schema: BlockNumberResponseSchema } }
      }
    }
  });

  return registry;
}
