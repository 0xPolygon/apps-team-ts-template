/**
 * Generates openapi.json from the schemas registry.
 * Runs automatically as part of the `build` script.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

// Import the package's main entry first — its side effect
// (extendZodWithOpenApi) must run before buildRegistry() accesses any schema
// for the first time. The package self-import resolves to ./src via the
// @polygonlabs/source condition at typecheck time and to ./dist at runtime
// (the build script emits dist/ before this script runs).
import '@polygonlabs/example-schemas';
import { buildRegistry } from '@polygonlabs/example-schemas/registry';

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
