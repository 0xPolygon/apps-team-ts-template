import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    // Vitest runs Node-based tests through Vite's SSR pipeline. Vite 7 (and
    // Vitest 4, which still bundles Vite 7 by default) routes SSR resolution
    // through `ssr.resolve.conditions`; top-level `resolve.conditions` only
    // applies to the client environment and is ignored here. Put the
    // '@polygonlabs/source' condition here so `@polygonlabs/example-client`
    // and `@polygonlabs/example-schemas` resolve to their TypeScript sources
    // without needing a built `dist/`.
    resolve: {
      conditions: ['@polygonlabs/source']
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration is opt-in via `pnpm run test:integration` — never picked up
    // by the hermetic unit run, so it can't accidentally boot Docker or hit a
    // deployment.
    exclude: ['tests/integration/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
    ...(process.env.CI ? { reporters: ['verbose'] as const } : {})
  }
});
