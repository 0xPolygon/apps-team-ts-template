import * as Sentry from '@sentry/react';

import { env } from './env';

const dsn = env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()]
  });
}
