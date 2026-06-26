import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

// Validates a single RPC URL. Error messages use the URL origin only — never
// the full URL, which may carry a secret token in its query string.
// rpc.polygon.tools is a public endpoint that 301-redirects http:// requests;
// some clients never follow the redirect, so http:// against that host is
// rejected here. All other hosts (e.g. in-cluster eRPC) allow http or https.
const RpcUrlSchema = z.string().superRefine((url, ctx) => {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    ctx.addIssue('Invalid URL');
    return;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    ctx.addIssue(`"${u.origin}" must use https:// or http://`);
    return;
  }
  if (u.hostname === 'rpc.polygon.tools' && u.protocol !== 'https:') {
    ctx.addIssue(`"${u.origin}" — rpc.polygon.tools requires https://`);
  }
});

// A 0x-prefixed 40-hex-char address, checksum-agnostic (devnets emit
// lower-cased addresses). Narrows to viem's `0x${string}` for the contract
// config without a downstream cast.
const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a 0x-prefixed 40-character hex address')
  .transform((v) => v as `0x${string}`);

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
      // Health/service-status HTTP surface.
      PORT: z.coerce.number().default(3000),
      PRETTY_LOGS: BooleanOrBooleanStringSchema.optional(),
      SENTRY_DSN: z.url().optional(),

      // ── Chain + contract being indexed ──────────────────────────────────
      RPC_URL: RpcUrlSchema,
      RPC_CHAIN_ID: z.coerce.number().int().positive(),
      // The contract whose `Ping` events this indexer ingests. The event ABI
      // is a code constant (see config/events.ts) — only the address, chain,
      // and scan window are environment-configurable.
      CONTRACT_ADDRESS: AddressSchema,
      // Cold-start scan origin. On restart the indexer resumes from the
      // persisted cursor instead, so this only matters on a fresh DB.
      START_BLOCK: z.coerce.number().int().nonnegative().default(0),
      // Blocks per getLogs call. The watcher chunks both backfill and the
      // live tail by this, so a cursor far behind the tip never asks for a
      // range the RPC rejects.
      BATCH_SIZE: z.coerce.number().int().positive().default(500),
      // Live-tail poll cadence (ms) once caught up to the tip.
      POLLING_INTERVAL_MS: z.coerce.number().int().positive().default(1000),

      // ── Persistence (example-db) ────────────────────────────────────────
      NETWORK: z.enum(['mainnet', 'testnet', 'local']).default('local'),
      // The @google-cloud/firestore SDK auto-detects FIRESTORE_EMULATOR_HOST
      // and routes to the local emulator when set; absent in production (real
      // Firestore via Application Default Credentials). Present in the schema
      // so the contract is documented and validated.
      FIRESTORE_EMULATOR_HOST: z.string().optional(),
      // A `demo-*` project id keeps the emulator credential-free; the real GCP
      // project id in production.
      GOOGLE_CLOUD_PROJECT_ID: z.string().min(1).default('demo-example-indexer')
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
