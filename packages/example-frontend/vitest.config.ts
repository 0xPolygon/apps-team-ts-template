import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    env: {
      NEXT_PUBLIC_REOWN_PROJECT_ID: 'test-project-id'
    }
  }
});
