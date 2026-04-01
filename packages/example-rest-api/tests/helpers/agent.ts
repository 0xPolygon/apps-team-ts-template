import type { Server } from 'node:http';

import { JsonRpcProvider, Network } from 'ethers';
import request from 'supertest';

import { getEnv } from '../../src/env.ts';
import { createLogger } from '../../src/logger.ts';
import { getExpressApp } from '../../src/server.ts';
import { getTestEnv } from '../env.ts';

const logger = await createLogger();

let _server: Server | undefined;
let _setup: { agent: ReturnType<typeof request.agent>; baseUrl: string } | undefined;

export function getAgent(): { agent: ReturnType<typeof request.agent>; baseUrl: string } {
  if (_setup) return _setup;

  if (getTestEnv().TEST_BASE_URL) {
    const baseUrl = getTestEnv().TEST_BASE_URL as string;
    _setup = { agent: request.agent(baseUrl), baseUrl };
    return _setup;
  }

  if (!_server) {
    const provider = new JsonRpcProvider(getEnv().RPC_URL, undefined, {
      staticNetwork: Network.from(getEnv().RPC_CHAIN_ID)
    });
    _server = getExpressApp(logger, provider).listen(0);
  }

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
