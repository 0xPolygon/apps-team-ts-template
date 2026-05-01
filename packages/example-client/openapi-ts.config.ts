import { createRequire } from 'node:module';

import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { $, defineConfig } from '@hey-api/openapi-ts';

import { buildRegistry } from '@polygonlabs/example-schemas/registry';
import { registryPlugin } from '@polygonlabs/zod-to-openapi-heyapi';

const require = createRequire(import.meta.url);

export default defineConfig({
  // The committed openapi.json in example-schemas is the canonical spec
  // artifact — both the served /openapi.json and this codegen read from it,
  // so the generated client and the runtime spec never disagree.
  input: require.resolve('@polygonlabs/example-schemas/openapi.json'),
  output: { path: './src/generated', clean: true },
  plugins: [
    // Must precede @hey-api/typescript: the SDK plugin queries the metadata
    // store by symbol key and takes the first registered match. This plugin
    // emits `z.output<typeof Schema>` response types and a parseAsync
    // transformer for each operation, so codec decode (Int64Codec wire
    // string → bigint runtime, IsoDateCodec → Date, etc.) reaches the caller.
    (await registryPlugin({
      registry: buildRegistry(),
      schemasFrom: '@polygonlabs/example-schemas',
      generatorClass: OpenApiGeneratorV3,
      $
    })) as never,
    '@hey-api/typescript',
    '@hey-api/client-fetch',
    // includeInEntry: false is required — registryPlugin's wrappers are
    // the public SDK surface and the raw SDK plugin's same-name
    // emissions must stay out of the auto-generated entry barrel. The
    // plugin's pre-flight check throws with the exact config to write
    // if you forget.
    { name: '@hey-api/sdk', transformer: true, includeInEntry: false },
    {
      name: '@tanstack/react-query',
      queryKeys: true,
      mutationOptions: false,
      infiniteQueryOptions: false
    }
  ]
});
