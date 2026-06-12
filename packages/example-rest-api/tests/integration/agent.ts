/**
 * Supertest agent for the integration suite, in two modes — mirrors the
 * balance-api / gas-station pattern.
 *
 * - **In-process** (default — no `INTEGRATION_TARGET`, no `TEST_BASE_URL`):
 *   boots the real app via `createServer` and runs the suite against it.
 *   RPC fetchers are stubbed (`defaultTestDeps`) so the suite never depends
 *   on a reachable RPC, but the widget service is left to build from env —
 *   so it connects to the Firestore emulator + Redis that globalSetup stood
 *   up. This is `pnpm run test:integration`.
 * - **URL** (`INTEGRATION_TARGET=prod|dev|local` or `TEST_BASE_URL=<url>`):
 *   supertest against a running server; globalSetup skips Docker. Remote
 *   targets must be HTTPS; only loopback may use plain http.
 *
 * NOTE: the cache-aside suite is STATEFUL (it seeds Firestore and inspects
 * Redis directly), so it only runs in-process — see its `skipIf`. The URL
 * path is carried because it's the canonical shape a STATELESS smoke suite
 * (e.g. balance-api) runs in every mode; downstream repos copy this file.
 */
import type { Server } from 'node:http';

import request from 'supertest';
import { expect } from 'vitest';

import { createLogger } from '../../src/logger.ts';
import { createServer } from '../../src/server.ts';
import { defaultTestDeps } from '../helpers/agent.ts';

// Replace dev/prod with this service's real deployment URLs when adopting the
// template; `local` assumes `pnpm dev` on the default port.
const TARGETS = {
  prod: 'https://example-rest-api.polygon.technology',
  dev: 'https://example-rest-api.development.polygon.internal',
  local: 'http://localhost:3000'
} as const;

function resolveBaseUrl(): string | undefined {
  const override = process.env['TEST_BASE_URL'];
  if (override) return override;
  const target = process.env['INTEGRATION_TARGET'];
  if (!target) return undefined; // in-process mode
  expect(TARGETS, `unknown INTEGRATION_TARGET: ${target}`).property(target);
  return TARGETS[target as keyof typeof TARGETS];
}

const externalBaseUrl = resolveBaseUrl();
if (externalBaseUrl !== undefined) {
  expect(externalBaseUrl, 'remote target must be HTTPS (only localhost may use http)').match(
    /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$))/
  );
}

/** True when the suite targets a deployed/remote server rather than booting in-process. */
export const isUrlTarget = externalBaseUrl !== undefined;

const logger = await createLogger();

let _server: Server | undefined;
let _setup: { agent: ReturnType<typeof request.agent>; baseUrl: string } | undefined;

/**
 * Returns a supertest agent and the base URL it targets. Stable for the
 * lifetime of the test file (Vitest isolates files).
 */
export function getAgent(): { agent: ReturnType<typeof request.agent>; baseUrl: string } {
  if (_setup) return _setup;

  if (externalBaseUrl !== undefined) {
    _setup = { agent: request.agent(externalBaseUrl), baseUrl: externalBaseUrl };
    return _setup;
  }

  // In-process: stub RPC (defaultTestDeps) but let the widget service build
  // from env so it reaches the docker-compose Firestore + Redis.
  _server ??= createServer(logger, defaultTestDeps).listen(0);
  const addr = _server.address();
  if (!addr || typeof addr === 'string') throw new Error('Server not yet listening');
  const baseUrl = `http://localhost:${addr.port}`;
  _setup = { agent: request.agent(baseUrl), baseUrl };
  return _setup;
}

export function closeAgent(): Promise<void> {
  return new Promise((resolve) => {
    if (_server) {
      // Closing the server fires its 'close' handler, which quits the
      // widget service's Redis connection.
      _server.close(() => resolve());
    } else {
      resolve();
    }
  });
}
