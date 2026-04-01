import { createRequire } from 'module';

import { defineConfig } from 'orval';

const require = createRequire(import.meta.url);

export default defineConfig({
  exampleApi: {
    input: {
      target: require.resolve('@polygonlabs/example-schemas/openapi.json')
    },
    output: {
      mode: 'single',
      target: 'src/generated/client.ts',
      schemas: 'src/generated/model',
      client: 'fetch',
      clean: true,
      override: {
        useNamedParameters: true,
        mutator: {
          path: 'src/fetcher.ts',
          name: 'customFetch'
        }
      }
    }
  }
});
