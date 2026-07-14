/**
 * Vitest global setup owned by the ONE `vitest.config.ts` that runs unit +
 * service-integration together (the four-layer doctrine — there is no separate
 * vitest.integration.config.ts). It owns env loading AND the lifecycle of BOTH
 * local resources (Firestore emulator + Redis), mirroring pos-airdrop's
 * (Firestore) and balance-api's (Redis) canonical globalSetups combined into
 * one. The unit subset stays fast because the app's resource clients are built
 * lazily (src/firestore.ts, src/redis.ts) — a test that never touches a
 * resource-backed route never opens a connection, even though the emulator is
 * up.
 *
 * The gate flags are read from the RAW environment at module load (before any
 * .env loading), so they reflect what CI/shell actually set — not what the
 * .env files contain. This load-order invariant is load-bearing: `.env.test`
 * sets REDIS_URL + FIRESTORE_EMULATOR_HOST as placeholders so env validation
 * passes for the unit subset, and capturing the flags before that load is what
 * keeps Docker from being skipped locally. Keep the dotenvx calls inside
 * setup().
 *
 * Three modes:
 * - URL target (`TEST_BASE_URL`): the suite is pointed at an already-running
 *   server, so no local infra is managed here. (The service-integration tests
 *   in this package are STATEFUL and run in-process; this branch is the gate a
 *   stateless suite pointed at a local server would rely on.)
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

const targetingUrl = !!process.env['TEST_BASE_URL'];
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

// Vars whose externally-provided value (CI / a dev pointing at their own
// infra) must survive the `.env.test` override below. `.env.test` carries
// placeholders ONLY so the hermetic unit suite passes env validation; they
// must never clobber real values CI injected. MANAGEMENT_API_KEY is here
// because the docker-release test job starts the container with its own key
// and the suite must authenticate with that same value — letting the
// committed placeholder win produced 401s on every auth-gated container test.
const PRESERVED_VARS = [
  'MANAGEMENT_API_KEY',
  'REDIS_URL',
  'REDIS_CLUSTER',
  'FIRESTORE_EMULATOR_HOST',
  'GOOGLE_CLOUD_PROJECT_ID'
] as const;

export function setup(): void {
  // Capture externally-provided vars before loading .env files.
  const provided = new Map(
    PRESERVED_VARS.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]])
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

  // Restore externally-provided vars so CI-injected values win over the
  // committed .env.test placeholders. Anything not externally set (the local
  // in-process run) still comes from .env.test.
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
