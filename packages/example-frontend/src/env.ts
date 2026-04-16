import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SEQUENCE_PROJECT_ACCESS_KEY: z.string().min(1),
    VITE_SEQUENCE_WALLET_URL: z.url(),
    VITE_DAPP_ORIGIN: z.url(),
    VITE_WALLET_CONNECT_PROJECT_ID: z.string().min(1).optional(),
    VITE_API_URL: z.url(),
    VITE_SENTRY_DSN: z.url().optional()
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true
});
