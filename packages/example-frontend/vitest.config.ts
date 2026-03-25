import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    reporters: process.env.CI ? ['verbose'] : undefined,
    env: {
      VITE_SEQUENCE_PROJECT_ACCESS_KEY: 'test-project-access-key',
      VITE_SEQUENCE_WAAS_KEY: 'test-waas-key'
    }
  }
});
