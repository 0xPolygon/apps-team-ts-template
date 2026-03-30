import * as Sentry from '@sentry/node';

import { getEnv } from './env.ts';

const { SENTRY_DSN, NODE_ENV } = getEnv();

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: 0.1
  });
}
