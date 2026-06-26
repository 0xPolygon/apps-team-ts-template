import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    // Resolve workspace deps (`@polygonlabs/example-db`) to their TypeScript
    // sources via the custom condition, so unit tests run with no build step.
    // See example-rest-api/vitest.config.ts for the full rationale.
    resolve: {
      conditions: ['@polygonlabs/source']
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    ...(process.env.CI ? { reporters: ['verbose'] as const } : {})
  }
});
