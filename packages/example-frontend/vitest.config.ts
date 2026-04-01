import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@polygonlabs/source']
  },
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    ...(process.env.CI ? { reporters: ['verbose'] as const } : {}),
    env: {
      VITE_SEQUENCE_PROJECT_ACCESS_KEY: 'test-project-access-key',
      VITE_SEQUENCE_WAAS_KEY: 'test-waas-key'
    }
  }
});
