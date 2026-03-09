import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional()
  },
  runtimeEnv: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN
  },
  emptyStringAsUndefined: true
});
