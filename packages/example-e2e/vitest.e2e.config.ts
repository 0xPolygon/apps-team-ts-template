import { defineConfig } from 'vitest/config';

/**
 * E2E vitest config — runs the indexing suite against a live kurtosis-pos bor
 * devnet (restored from the apps-team snapshot) plus a Firestore emulator. The
 * only vitest config in the package; there is no `test` script, so
 * `pnpm -r run test` correctly skips this package — e2e is opt-in
 * (`pnpm run e2e`, the `run-e2e` PR label, or workflow_dispatch).
 *
 * `pool: 'forks'` gives a clean process boundary so module-level state (viem
 * clients, the indexer consumer's timers) doesn't leak. `hookTimeout` is
 * generous: `beforeAll` deploys a contract and mines several blocks on a cold
 * devnet.
 */
export default defineConfig({
  ssr: {
    // Resolve workspace deps (example-db, example-indexer) to their TypeScript
    // sources via the custom condition, so the suite runs with no build step.
    resolve: {
      conditions: ['@polygonlabs/source']
    }
  },
  test: {
    include: ['test/**/*.e2e.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    env: { PRETTY_LOGS: 'true' },
    hookTimeout: 180_000,
    testTimeout: 120_000,
    pool: 'forks',
    fileParallelism: false
  }
});
