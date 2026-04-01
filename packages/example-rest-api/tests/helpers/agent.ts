import type { Server } from 'node:http';

import request from 'supertest';

import { createLogger } from '../../src/logger.ts';
import { createServer } from '../../src/server.ts';
import { getTestEnv } from '../env.ts';

// Resolved once at module load so getAgent() stays synchronous. Top-level
// await is valid here because this module is loaded by Vitest as ESM.
const logger = await createLogger();

let _server: Server | undefined;
let _setup: { agent: ReturnType<typeof request.agent>; baseUrl: string } | undefined;

/**
 * Returns a supertest agent and the base URL it targets. Call once per test
 * file — the result is stable for the lifetime of the process.
 *
 * When TEST_BASE_URL is set, both point at that remote URL.
 * Otherwise an in-process server is started on an OS-assigned port (listen(0))
 * and reused for every call, so services initialise once and stay up for the
 * full test file.
 */
export function getAgent(): { agent: ReturnType<typeof request.agent>; baseUrl: string } {
  if (_setup) return _setup;

  if (getTestEnv().TEST_BASE_URL) {
    const baseUrl = getTestEnv().TEST_BASE_URL as string;
    _setup = { agent: request.agent(baseUrl), baseUrl };
    return _setup;
  }

  _server ??= createServer(logger).listen(0);
  const addr = _server.address();
  if (!addr || typeof addr === 'string') throw new Error('Server not yet listening');
  const baseUrl = `http://localhost:${addr.port}`;
  _setup = { agent: request.agent(baseUrl), baseUrl };
  return _setup;
}

export function closeAgent(): Promise<void> {
  return new Promise((resolve) => {
    if (_server) {
      _server.close(() => resolve());
    } else {
      resolve();
    }
  });
}
