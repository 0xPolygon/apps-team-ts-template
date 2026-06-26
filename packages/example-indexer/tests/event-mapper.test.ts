import type { AbiEvent } from 'viem';

import { describe, expect, it } from 'vitest';

import type { EventLogs } from '@polygonlabs/viem-event-watcher';

import { mapEventToIndexed } from '../src/mappers/event.ts';

type DecodedLog = EventLogs<readonly AbiEvent[]>[number];

// A log shaped the way viem hands it to the consumer: numeric index keys
// alongside named keys, with bigint values for uint params. Cast via `unknown`
// (test fixture) to mirror the runtime shape without rebuilding viem's full type.
function makeLog(args: unknown): DecodedLog {
  return {
    eventName: 'Ping',
    args,
    address: '0xd1b5cb33b85b46df57f4ad21d8651da6cb02b8b8',
    topics: ['0xabc'],
    data: '0x',
    blockNumber: 1234n,
    transactionHash: '0xdeadbeef',
    transactionIndex: 2,
    blockHash: '0xfeed',
    logIndex: 5,
    removed: false
  } as unknown as DecodedLog;
}

describe('mapEventToIndexed', () => {
  it('serializes bigints, strips positional index keys, lowercases the address', () => {
    const log = makeLog({
      0: '0xSENDER',
      1: 42n,
      sender: '0xSENDER',
      seq: 42n
    });

    const result = mapEventToIndexed({
      chain: 4927,
      contractAddress: '0xCONTRACT',
      event: log,
      indexedAt: 1700000000000
    });

    // Positional (numeric) keys dropped; bigints stringified; primitives kept.
    expect(result.args).deep.equal({ sender: '0xSENDER', seq: '42' });
    expect(result).property('id', '0xdeadbeef-5');
    expect(result).property('contract_address', '0xcontract');
    expect(result).property('event_name', 'Ping');
    expect(result).property('block_number', 1234);
    expect(result).property('tx_hash', '0xdeadbeef');
    expect(result).property('log_index', 5);
    expect(result).property('transaction_index', 2);
    expect(result).property('indexed_at', 1700000000000);
  });

  // Regression: viem omits `args` for parameterless events. The mapper spreads
  // `{ ...event.args }`, so undefined/null args yield {} rather than throwing.
  it('returns an empty args map when event.args is undefined', () => {
    const result = mapEventToIndexed({
      chain: 4927,
      contractAddress: '0xCONTRACT',
      event: makeLog(undefined),
      indexedAt: 1700000000000
    });

    expect(result.args).deep.equal({});
  });
});
