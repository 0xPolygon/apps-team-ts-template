import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

// Validates a single RPC URL. Error messages use the URL origin only —
// never the full URL, which may contain secret tokens in query parameters.
// rpc.polygon.tools is a public endpoint that redirects http:// requests
// with a 301. Ethers never follows redirects — it interprets the non-200
// response as event="noNetwork", making the RPC appear dead when healthy.
// All other RPC hosts (e.g. in-cluster eRPC) allow http or https.
const RpcUrlSchema = z.string().superRefine((url, ctx) => {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    ctx.addIssue(`Invalid URL`);
    return;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    ctx.addIssue(`"${u.origin}" must use https:// or http://`);
    return;
  }
  if (u.hostname === 'rpc.polygon.tools' && u.protocol !== 'https:') {
    ctx.addIssue(
      `"${u.origin}" — rpc.polygon.tools requires https:// (http:// triggers a 301 that ethers never follows)`
    );
  }
});

// Parses a JSON-encoded string array of RPC URLs, validating each element
// with RpcUrlSchema. Use this pattern when a service needs multiple RPC
// endpoints for retry/failover. Used as a .transform() callback in the env schema.
const parseRpcUrlArray = (val: string, ctx: z.RefinementCtx) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(val);
  } catch {
    ctx.addIssue('Must be valid JSON.');
    return z.NEVER;
  }
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    ctx.addIssue('Must be a valid JSON string array.');
    return z.NEVER;
  }
  for (const url of parsed as string[]) {
    const result = RpcUrlSchema.safeParse(url);
    if (!result.success) {
      ctx.addIssue(result.error.issues[0]?.message ?? 'Invalid RPC URL');
      return z.NEVER;
    }
  }
  return parsed as string[];
};

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
      RPC_URL: RpcUrlSchema,
      // Use RPC_URLS (JSON array) when the service needs multiple endpoints
      // for retry/failover. Each element is validated by RpcUrlSchema.
      // Example value: '["https://rpc1.example.com","https://rpc2.example.com"]'
      RPC_URLS: z.string().transform(parseRpcUrlArray).optional(),
      RPC_CHAIN_ID: z.coerce.number().int().positive(),
      // Shared secret for the management endpoints — operations declaring
      // `security: [{ ApiKeyAuth: [] }]` require `x-api-key: <MANAGEMENT_API_KEY>`.
      // Required: there is no public mode; production deployments must
      // provision a value via the secret manager.
      MANAGEMENT_API_KEY: z.string().min(1),
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
