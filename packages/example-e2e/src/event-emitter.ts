import type { Account, Address, Chain, PublicClient, WalletClient } from 'viem';

import { numberToHex, parseAbiItem } from 'viem';

/**
 * A minimal event-emitting contract as raw creation bytecode — no Foundry, no
 * solc, no compiled artifact to keep in sync. Embedding the bytecode keeps the
 * e2e suite self-contained: deploy it, call it, and assert the indexer picks up
 * the logs.
 *
 * Equivalent Solidity:
 *
 *   event Ping(address indexed sender, uint256 seq);
 *   // On any call, emit Ping(msg.sender, <first 32 bytes of calldata as uint256>).
 *   fallback() external { emit Ping(msg.sender, abi.decode(msg.data, (uint256))); }
 *
 * Hand-assembled EVM:
 *   init (12 bytes):  CODECOPY the 46-byte runtime to memory and RETURN it.
 *   runtime (46 bytes):
 *     mem[0..32] = calldataload(0)            // the seq argument (log data)
 *     LOG2(offset=0, size=32,
 *          topics[0]=keccak256("Ping(address,uint256)"),
 *          topics[1]=CALLER)                  // indexed sender
 *
 * topics[0] = 0xfd8d0c1d…063c9d is `toEventSelector('event Ping(address indexed
 * sender, uint256 seq)')` — keep it in sync with `pingEvent` below if the
 * signature ever changes.
 */
export const EVENT_EMITTER_BYTECODE =
  '0x602e600c600039602e6000f3600035600052337ffd8d0c1dc3ab254ec49463a1192bb2423b3b851adedec1aa94dcd362dc063c9d60206000a200' as const;

/** The event the embedded contract emits — the indexer's `IndexedEvents` tuple. */
export const pingEvent = parseAbiItem('event Ping(address indexed sender, uint256 seq)');

/** Deploy the event emitter; returns its address and the block it landed in. */
export async function deployEventEmitter({
  publicClient,
  walletClient,
  account,
  chain
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Account;
  chain: Chain;
}): Promise<{ address: Address; deployBlock: bigint }> {
  const hash = await walletClient.sendTransaction({ account, chain, data: EVENT_EMITTER_BYTECODE });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.contractAddress === null || receipt.contractAddress === undefined) {
    throw new Error('Deployment produced no contract address');
  }
  return { address: receipt.contractAddress, deployBlock: receipt.blockNumber };
}

/** Call the emitter with `seq`, producing one `Ping(sender, seq)` log. */
export async function emitPing({
  publicClient,
  walletClient,
  account,
  chain,
  address,
  seq
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Account;
  chain: Chain;
  address: Address;
  seq: bigint;
}): Promise<void> {
  // 32-byte big-endian seq — the calldata the runtime reads via calldataload(0).
  const hash = await walletClient.sendTransaction({
    account,
    chain,
    to: address,
    data: numberToHex(seq, { size: 32 })
  });
  await publicClient.waitForTransactionReceipt({ hash });
}
