import type { UserConfig } from '@hey-api/openapi-ts';

import { createRequire } from 'node:module';

import { buildRegistry } from '@polygonlabs/example-schemas/registry';
import { defineRegistryClientConfig } from '@polygonlabs/zod-to-openapi-heyapi';

const require = createRequire(import.meta.url);

// Drive codegen through the canonical factory — locks in plugin order, sdk
// flags (transformer: true, includeInEntry: false), and resolution-fragile
// passthroughs ($, OpenApiGeneratorV3) so the only knobs the consumer turns
// are registry / schemasFrom / input / output / tanstackReactQuery.
//
// `tanstackReactQuery: true` wires the upstream `@tanstack/react-query`
// plugin alongside us and installs a parser-level `isQuery: false` hook for
// codec op ids. Codec ops get factories from this plugin (typed against
// `${Op}Input`, codec slots pre-encoded into the queryKey); non-codec ops
// get the standard wire-shape factories from upstream. Same names across
// both files, no collisions.
//
// Explicit `UserConfig` annotation is required: composite-mode declaration
// emit on this file (now triggered because `tsconfig.spec.json` inherits
// `composite: true` from `tsconfig.base.json`) trips TS2742 on the
// inferred `Promise<UserConfig>` return because `@hey-api/openapi-ts`
// exposes `UserConfig` via a tsup-renamed re-export from a hashed
// internal file (`./types-DAEl4_a4.mjs`). Without the annotation, TS
// follows the symbol chain to the realpath under `.pnpm/...` and
// refuses to bake a non-portable reference into the emitted `.d.ts`.
// The explicit name tells TS to emit `import('@hey-api/openapi-ts').UserConfig`
// — portable, no chain-following needed.
const config: UserConfig = await defineRegistryClientConfig({
  registry: buildRegistry(),
  schemasFrom: '@polygonlabs/example-schemas',
  // The committed openapi.json in example-schemas is the canonical spec
  // artifact — both the served /openapi.json and this codegen read from it,
  // so the generated client and the runtime spec never disagree.
  input: require.resolve('@polygonlabs/example-schemas/openapi.json'),
  output: { path: './src/generated', clean: true },
  tanstackReactQuery: true
});
export default config;
