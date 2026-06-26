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
    // The ONE config that runs unit + service-integration together (the
    // four-layer doctrine: no separate vitest.integration.config.ts). The
    // globalSetup owns the Firestore-emulator + Redis lifecycle; resource
    // clients are built lazily (src/firestore.ts, src/redis.ts) so the unit
    // subset never opens a connection. See
    // apps-team-ops/docs/best-practices/{testing,local-test-infrastructure}.md.
    include: ['tests/**/*.test.ts'],
    // Keep prod-smoke OUT of `pnpm test` so a bare run can never hit a deployed
    // instance — that tier runs only via its own `test:*-smoke` scripts. (No
    // prod-smoke files exist yet; the exclude is the doctrine-mandated guard.)
    exclude: ['tests/prod-smoke/**', 'node_modules/**'],
    globalSetup: ['./vitest.globalSetup.ts'],
    setupFiles: ['./vitest.setup.ts'],
    ...(process.env.CI ? { reporters: ['verbose'] as const } : {})
  }
});
