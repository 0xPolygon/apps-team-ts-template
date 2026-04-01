import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Called here so this file is self-contained — any direct import triggers
// the extension before schemas are accessed.
extendZodWithOpenApi(z);

export const HealthCheckResponseSchema = z
  .object({
    success: z.boolean()
  })
  .openapi('HealthCheckResponse');

export const HelloResponseSchema = z
  .object({
    message: z.string()
  })
  .openapi('HelloResponse');

export const BlockNumberResponseSchema = z
  .object({
    blockNumber: z.number().int().nonnegative()
  })
  .openapi('BlockNumberResponse');

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export type HelloResponse = z.infer<typeof HelloResponseSchema>;
export type BlockNumberResponse = z.infer<typeof BlockNumberResponseSchema>;
