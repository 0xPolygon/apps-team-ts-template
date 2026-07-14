import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

function buildTestEnv() {
  const env = createEnv({
    server: {
      TEST_BASE_URL: z.url().optional(),
      MANAGEMENT_API_KEY: z.string().min(1)
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true
  });

  return {
    /** Set to run the suite against a deployed instance instead of in-process. */
    TEST_BASE_URL: env.TEST_BASE_URL,
    /** True when the app runs in-process (no TEST_BASE_URL). */
    INPROCESS: !env.TEST_BASE_URL,
    /**
     * The API key the server under test was configured with. In-process the
     * server reads MANAGEMENT_API_KEY from `.env.test` in this same process;
     * in TEST_BASE_URL mode CI injects the value it started the container
     * with (vitest.globalSetup.ts preserves externally-set values over the
     * committed `.env.test` placeholder). Hardcoding the placeholder here
     * instead is what made every auth-gated call 401 in the Docker test job.
     */
    MANAGEMENT_API_KEY: env.MANAGEMENT_API_KEY
  };
}

type TestEnv = ReturnType<typeof buildTestEnv>;
let _testEnv: TestEnv | undefined;

/**
 * Returns validated test environment values. Deferred so the module can be
 * imported without side effects — validation runs on first call, after
 * dotenvx has loaded .env.test.
 */
export function getTestEnv(): TestEnv {
  return (_testEnv ??= buildTestEnv());
}
