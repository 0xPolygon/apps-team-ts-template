import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    // Vitest runs tests in Node/SSR mode. In Vite 7, resolve.conditions applies
    // to the client environment only; SSR resolution uses ssr.resolve.conditions.
    // Adding 'source' causes the SSR resolver to pick ./src/index.ts from workspace
    // library exports, so tests work without building dist/.
    resolve: {
      conditions: ['source']
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    ...(process.env.CI ? { reporters: ['verbose'] as const } : {})
  }
});
