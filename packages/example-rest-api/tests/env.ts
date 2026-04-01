import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

function buildTestEnv() {
  const env = createEnv({
    server: {
      TEST_BASE_URL: z.url().optional()
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true
  });

  return {
    /** Set to run the suite against a deployed instance instead of in-process. */
    TEST_BASE_URL: env.TEST_BASE_URL,
    /** True when the app runs in-process (no TEST_BASE_URL). */
    INPROCESS: !env.TEST_BASE_URL
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
