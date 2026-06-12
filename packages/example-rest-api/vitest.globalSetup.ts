/**
 * Vitest global setup for the in-process integration suite — owns env loading
 * AND the lifecycle of BOTH local resources (Firestore emulator + Redis),
 * mirroring pos-airdrop's (Firestore) and balance-api's (Redis) canonical
 * globalSetups combined into one.
 *
 * The gate flags are read from the RAW environment at module load (before any
 * .env loading), so they reflect what CI/shell actually set — not what the
 * .env files contain. This load-order invariant is load-bearing: `.env.test`
 * sets REDIS_URL + FIRESTORE_EMULATOR_HOST as placeholders for the hermetic
 * unit suite, and capturing the flags before that load is what keeps Docker
 * from being skipped locally. Keep the dotenvx calls inside setup().
 *
 * Three modes:
 * - URL target (`INTEGRATION_TARGET` / `TEST_BASE_URL`): the suite hits a
 *   deployed server — no local infra. (This stateful cache-aside suite is
 *   in-process only; the URL path exists for the canonical pattern that
 *   STATELESS suites like balance-api use — see tests/integration/agent.ts.)
 * - BOTH `REDIS_URL` and `FIRESTORE_EMULATOR_HOST` already set (CI service
 *   containers via `job.env`, or a dev pointing at their own infra): use them
 *   as-is — don't manage Docker. The explicit-injection path.
 * - Otherwise: bring docker-compose up, discover the EPHEMERAL host ports both
 *   services published (so concurrent suites never collide on a fixed port),
 *   and export both env vars. Discovery runs AFTER the .env load so the
 *   docker-compose ports always win over any stale values a local .env
 *   carries for `pnpm dev`.
 *
 * Env is loaded here in the global process so it propagates to the worker that
 * boots the in-process app (which validates env at construction) and to the
 * test's own Firestore/Redis clients that seed and inspect state.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { config as dotenvxConfig } from '@dotenvx/dotenvx';

const targetingUrl = !!process.env['INTEGRATION_TARGET'] || !!process.env['TEST_BASE_URL'];
const resourcesProvided = !!process.env['REDIS_URL'] && !!process.env['FIRESTORE_EMULATOR_HOST'];
const manageDocker = !targetingUrl && !resourcesProvided;

// Reads the host port docker-compose published for a container port. `??`
// guards a missing/failed mapping; `.at(-1)` takes the port from
// "0.0.0.0:<port>".
function discoverHostPort(service: string, containerPort: string): string | undefined {
  const mapping =
    spawnSync('docker', ['compose', 'port', service, containerPort], {
      cwd: import.meta.dirname,
      encoding: 'utf8'
    }).stdout?.trim() ?? '';
  return mapping.split(':').at(-1) || undefined;
}

// Resource vars whose externally-provided value (CI / a dev pointing at their
// own infra) must survive the `.env.test` override below. `.env.test` carries
// localhost placeholders ONLY so the hermetic unit suite passes env
// validation; they must never clobber real values CI injected.
const RESOURCE_VARS = [
  'REDIS_URL',
  'REDIS_CLUSTER',
  'FIRESTORE_EMULATOR_HOST',
  'GOOGLE_CLOUD_PROJECT_ID'
] as const;

export function setup(): void {
  // Capture externally-provided resource vars before loading .env files.
  const provided = new Map(
    RESOURCE_VARS.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]])
  );

  // MISSING_ENV_FILE is suppressed so URL-target and CI runs (env via the
  // workflow job.env, no .env file in the checkout) work without either file.
  dotenvxConfig({
    path: resolve(import.meta.dirname, '.env'),
    ignore: ['MISSING_ENV_FILE'],
    quiet: true
  });
  dotenvxConfig({
    path: resolve(import.meta.dirname, '.env.test'),
    override: true,
    ignore: ['MISSING_ENV_FILE'],
    quiet: true
  });

  // Restore externally-provided resource vars so CI-injected values win over
  // the committed .env.test placeholders. (.env.test still supplies the rest —
  // RPC_URL, MANAGEMENT_API_KEY — which CI does not inject.)
  for (const [k, v] of provided) process.env[k] = v;

  if (!manageDocker) return;

  spawnSync('docker', ['compose', 'up', '-d', '--wait'], {
    cwd: import.meta.dirname,
    stdio: 'inherit'
  });

  // Redis: discovered host port exposed to the app via an explicit REDIS_URL.
  const redisPort = discoverHostPort('redis', '6379');
  if (redisPort) {
    process.env['REDIS_URL'] = `localhost:${redisPort}`;
    process.env['REDIS_CLUSTER'] = 'false';
  }

  // Firestore: discovered host port exposed via FIRESTORE_EMULATOR_HOST, the
  // var the @google-cloud/firestore SDK auto-detects. Two discovery styles —
  // explicit URL vs SDK convention — in one globalSetup is the point of this
  // example.
  const firestorePort = discoverHostPort('firestore-emulator', '8080');
  if (firestorePort) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${firestorePort}`;
  }
}

export function teardown(): void {
  if (!manageDocker) return;
  spawnSync('docker', ['compose', 'down'], {
    cwd: import.meta.dirname,
    stdio: 'inherit'
  });
}
