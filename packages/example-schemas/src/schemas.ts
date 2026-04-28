import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { Int64Codec } from '@polygonlabs/zod-codecs';

// Called here so this file is self-contained — any direct import triggers
// the extension before schemas are accessed.
extendZodWithOpenApi(z);

// Export name === registry name. The @polygonlabs/zod-to-openapi-heyapi
// plugin emits `import { <registeredName> } from '<schemasFrom>'` and audits
// at codegen time that each registered name resolves to a Zod schema export
// of the same name; renaming the export breaks the generated client.

export const HealthCheckResponse = z
  .object({
    success: z.boolean()
  })
  .openapi('HealthCheckResponse');

export const HelloResponse = z
  .object({
    message: z.string()
  })
  .openapi('HelloResponse');

// `blockNumber` uses Int64Codec to demonstrate the codec pattern: wire format
// is a string (JSON has no native int64), runtime is `bigint`. The generated
// client's response transformer decodes the string into a bigint before it
// reaches the caller, so consumers see the type the codec promises.
//
// Note: `.openapi(...)` cannot be chained directly onto codecs from another
// package — Zod v4 wires methods onto subclass prototypes at construction
// time, and the codec was constructed inside @polygonlabs/zod-codecs before
// extendZodWithOpenApi(z) ran here. Use the codec as-is; per-field
// description metadata can live on the surrounding object's .openapi().
export const BlockNumberResponse = z
  .object({
    blockNumber: Int64Codec
  })
  .openapi('BlockNumberResponse', {
    description: 'Latest block number from the configured RPC endpoint'
  });
