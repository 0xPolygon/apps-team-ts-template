/**
 * Block/network handlers — `getBlockNumber` reads from the polled
 * NetworkService cache; `getBlockMetadata` is the codec-on-path-param stress
 * test (Int64Codec on `:blockNumber`, multiple Int64Codec fields on the
 * response). End-to-end it proves the registry middleware decodes the path
 * codec into a `bigint` for the handler, and `z.encode` re-emits the wire
 * shape on the response side.
 *
 * `getBlockMetadata` is also gated by `ApiKeyAuth`. The auth handler runs
 * before request validation, so an unauthenticated request returns 401
 * without ever decoding the path codec.
 */

import type { Operations } from '@polygonlabs/example-schemas';

import { getLogger } from '@polygonlabs/express';
import { defineHandlers } from '@polygonlabs/express/registry';

import type { BlockData } from '../server.ts';
import type { NetworkService } from '../services/NetworkService.ts';
import type { AppAuthMap } from './auth.ts';

export function buildNetworkHandlers(deps: {
  blockNumberService: NetworkService<number>;
  getBlock: (blockNumber: bigint) => Promise<BlockData | null>;
}) {
  return defineHandlers<Operations, AppAuthMap>()({
    getBlockNumber: async (_req, res) => {
      const blockNumber = await deps.blockNumberService.get();
      getLogger().debug({ blockNumber }, 'block number fetched');
      // Wire shape: Int64Codec encode (bigint → digit string). The handler
      // hands a bigint to res.json; the response validator runs z.encode and
      // emits the digit string. JSON-safe end-to-end.
      res.json({ blockNumber: BigInt(blockNumber) });
    },

    getBlockMetadata: async (req, res) => {
      // req.params.blockNumber is already a bigint here — Int64Codec ran
      // inside the request validator, decoding the URL string before this
      // handler was called.
      const block = await deps.getBlock(req.params.blockNumber);
      if (block === null) {
        res.status(404).json({
          error: true,
          message: `Block ${req.params.blockNumber.toString()} not found`
        });
        return;
      }
      res.json(block);
    }
  });
}
