import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

// Ref: https://github.com/t3-oss/t3-env/pull/145
const truthyStrings = ['true', 'yes', 'y', '1', 'on'];
const falsyStrings = ['false', 'no', 'n', '0', 'off'];
const booleanStrings = [...truthyStrings, ...falsyStrings, true, false];

const BooleanOrBooleanStringSchema = z
  .any()
  .refine((val) => booleanStrings.includes(val), { message: 'must be boolean' })
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const normalized = val.toLowerCase().trim();
      if (truthyStrings.includes(normalized)) return true;
      if (falsyStrings.includes(normalized)) return false;
      throw new Error(`Invalid boolean string: "${val}"`);
    }
    throw new Error(`Expected boolean or boolean string, got: ${typeof val}`);
  });

function buildEnv() {
  return createEnv({
    server: {
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      PORT: z.coerce.number().default(3000),
      PRETTY_LOGS: BooleanOrBooleanStringSchema.optional(),
      SENTRY_DSN: z.url().optional()
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true
  });
}

export type Env = ReturnType<typeof buildEnv>;
let _env: Env | undefined;
export function getEnv(): Env {
  return (_env ??= buildEnv());
}
