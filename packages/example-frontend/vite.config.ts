import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  resolve: {
    conditions: ['source']
  },
  plugins: [
    tsconfigPaths(),
    react(),
    sentryVitePlugin({
      org: 'your-org',
      project: 'example-frontend',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI
    })
  ],
  build: {
    sourcemap: true
  }
});
