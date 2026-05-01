import type { Server } from 'node:http';

import request from 'supertest';

import type { BlockData, ServerDependencies } from '../../src/server.ts';

import { createLogger } from '../../src/logger.ts';
import { createServer } from '../../src/server.ts';
import { getTestEnv } from '../env.ts';

// Resolved once at module load so getAgent() stays synchronous. Top-level
// await is valid here because this module is loaded by Vitest as ESM.
const logger = await createLogger();

let _server: Server | undefined;
let _setup: { agent: ReturnType<typeof request.agent>; baseUrl: string } | undefined;

/**
 * Default in-process test fetchers. Keep RPC out of the test suite entirely:
 * `getBlockNumber` returns a deterministic value, `getBlock` returns an
 * Int64Codec-shaped record echoing the requested height. Tests that want
 * other behaviour pass their own deps to `getAgent({ deps })`.
 */
export const defaultTestDeps: ServerDependencies = {
  getBlockNumber: async () => 22_000_000,
  getBlock: async (blockNumber: bigint): Promise<BlockData | null> => {
    if (blockNumber === 0n) return null;
    return {
      number: blockNumber,
      hash: `0x${blockNumber.toString(16).padStart(64, '0')}`,
      parentHash: `0x${(blockNumber - 1n).toString(16).padStart(64, '0')}`,
      timestamp: 1_700_000_000n + blockNumber
    };
  }
};

/**
 * Returns a supertest agent and the base URL it targets. Call once per test
 * file — the result is stable for the lifetime of the process.
 *
 * When TEST_BASE_URL is set, both point at that remote URL.
 * Otherwise an in-process server is started on an OS-assigned port (listen(0))
 * and reused for every call, so services initialise once and stay up for the
 * full test file. Pass `deps` on the first call to override the default test
 * fetchers; subsequent calls return the cached server regardless of deps.
 */
export function getAgent(opts: { deps?: ServerDependencies } = {}): {
  agent: ReturnType<typeof request.agent>;
  baseUrl: string;
} {
  if (_setup) return _setup;

  if (getTestEnv().TEST_BASE_URL) {
    const baseUrl = getTestEnv().TEST_BASE_URL as string;
    _setup = { agent: request.agent(baseUrl), baseUrl };
    return _setup;
  }

  _server ??= createServer(logger, opts.deps ?? defaultTestDeps).listen(0);
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
