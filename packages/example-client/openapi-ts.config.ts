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
export default await defineRegistryClientConfig({
  registry: buildRegistry(),
  schemasFrom: '@polygonlabs/example-schemas',
  // The committed openapi.json in example-schemas is the canonical spec
  // artifact — both the served /openapi.json and this codegen read from it,
  // so the generated client and the runtime spec never disagree.
  input: require.resolve('@polygonlabs/example-schemas/openapi.json'),
  output: { path: './src/generated', clean: true },
  tanstackReactQuery: true
});
