import type { NextConfig } from 'next';

import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  // ESLint runs from the monorepo root via @polygonlabs/apps-team-lint — skip
  // the built-in Next.js lint step to avoid a false "plugin not detected" warning.
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default withSentryConfig(nextConfig, {
  org: 'your-org',
  project: 'example-frontend',
  silent: !process.env.CI,
  widenClientFileUpload: true
});
