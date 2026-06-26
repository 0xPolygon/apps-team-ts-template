import * as Sentry from '@sentry/node';

import type { Logger, SentryAdapter } from '@polygonlabs/logger';

import { createLogger as createPinoLogger } from '@polygonlabs/logger';

import { getEnv } from './env.ts';

export type { Logger };

/**
 * Builds the process logger. Called once at the entry point (`index.ts`) and
 * injected into services — never created at module scope elsewhere. Sentry is
 * wired only when `SENTRY_DSN` is set, so `logger.error` reaches Sentry while
 * `logger.warn` (retried failures) does not.
 */
export async function createLogger(): Promise<Logger> {
  const { PRETTY_LOGS, SENTRY_DSN } = getEnv();
  return createPinoLogger({
    pretty: PRETTY_LOGS,
    ...(SENTRY_DSN ? { sentry: Sentry as unknown as SentryAdapter } : {})
  });
}
