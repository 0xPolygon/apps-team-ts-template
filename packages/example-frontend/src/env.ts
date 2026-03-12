import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SEQUENCE_PROJECT_ACCESS_KEY: z.string().min(1),
    VITE_SEQUENCE_WAAS_KEY: z.string().min(1),
    VITE_SENTRY_DSN: z.url().optional()
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true
});
