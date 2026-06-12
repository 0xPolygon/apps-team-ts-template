import { defineConfig } from 'vitest/config';

// Integration suite — boots the real app against a Firestore emulator + Redis
// managed by vitest.globalSetup.ts (cache-aside example).
//
// Two modes (see tests/integration/agent.ts):
// - in-process (`pnpm run test:integration`, no target): globalSetup loads
//   .env/.env.test, brings up docker-compose, discovers the ephemeral host
//   ports, and the suite boots the real app against them.
// - URL (`test:{prod,dev,local}-integration`): hits a deployed/local server;
//   globalSetup skips docker. NOTE the cache-aside suite is stateful and
//   runs in-process only — the URL path is the canonical shape STATELESS
//   smoke suites (balance-api) use; see the skip in the suite.
//
// The default `vitest.config.ts` EXCLUDES `tests/integration/**` so a bare
// `pnpm run test:unit` never boots real infra.
export default defineConfig({
  ssr: {
    // Vitest 4 routes SSR resolution through `ssr.resolve.conditions`; this is
    // what lets `@polygonlabs/example-client` and `@polygonlabs/example-schemas`
    // resolve to their TypeScript sources without a built `dist/`. Copied from
    // vitest.config.ts — the integration suite needs it for the same workspace
    // deps.
    resolve: {
      conditions: ['@polygonlabs/source']
    }
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    globalSetup: ['./vitest.globalSetup.ts']
  }
});
