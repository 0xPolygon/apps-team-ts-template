/**
 * Generates openapi.json from the schemas registry.
 * Runs automatically as part of the `build` script.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

// Import index.ts first — its side effect (extendZodWithOpenApi) must run
// before buildRegistry() accesses any schema for the first time.
import '../src/index.ts';
import { buildRegistry } from '../src/registry.ts';

const spec = new OpenApiGeneratorV3(buildRegistry().definitions).generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Example REST API',
    version: '0.1.0',
    description: 'Stubbed REST API demonstrating the schemas/service/client monorepo pattern.'
  },
  servers: [{ url: '/' }]
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'openapi.json');
writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n');
console.log(`Written: ${outPath}`);
