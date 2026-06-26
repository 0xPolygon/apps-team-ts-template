import { defineConfig } from 'vitest/config';

// Prod-smoke suite — the fourth test tier. Points at a real, DEPLOYED instance
// by base URL (HTTPS) and validates each response body against the route's own
// Zod schema. GET-only: no app boot, no Firestore/Redis emulator, no
// globalSetup. Runs ONLY via `pnpm run test:prod-smoke` / `test:dev-smoke`; the
// default `vitest.config.ts` excludes `tests/prod-smoke/**` so a bare
// `pnpm test` can never reach a deployed instance. Doctrine:
// apps-team-ops/docs/best-practices/testing.md ("Prod-smoke is its own tier").
export default defineConfig({
  // Mirror the default config — the response schemas imported here come from
  // `@polygonlabs/example-schemas`, a workspace library that ships its source
  // only under the '@polygonlabs/source' condition (no built `dist/` locally).
  ssr: { resolve: { conditions: ['@polygonlabs/source'] } },
  test: {
    include: ['tests/prod-smoke/**/*.test.ts'],
    testTimeout: 20_000,
    env: { PRETTY_LOGS: 'true' }
  }
});
