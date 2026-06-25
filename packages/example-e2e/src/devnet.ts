import type { Account, Chain, PublicClient, WalletClient } from 'viem';

import { createPublicClient, createWalletClient, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Deterministic devnet coordinates. kurtosis-pos's `snapshot.sh` pins bor's RPC
 * to a fixed host port, the chain id is constant across every snapshot, and the
 * deployer is the publicly-documented kurtosis admin key — a test key, not a
 * secret. These are the same values lst-api's e2e harness pins; overridable via
 * env for a non-default devnet.
 */
export const L2_RPC_URL = process.env['L2_RPC_URL'] ?? 'http://127.0.0.1:9545';
export const L2_CHAIN_ID = Number(process.env['L2_CHAIN_ID'] ?? 4927);

// `as const` keeps this a `0x${string}` literal, so it satisfies
// `privateKeyToAccount` with no cast. Public kurtosis test key.
const ADMIN_PRIVATE_KEY =
  '0xd40311b5a5ca5eaeb48dfba5403bde4993ece8eccf4190e98e19fcd4754260ea' as const;

export interface DevnetClients {
  chain: Chain;
  account: Account;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

/** Build the viem chain + clients bound to the funded kurtosis admin account. */
export function getDevnetClients(): DevnetClients {
  const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);
  const chain = defineChain({
    id: L2_CHAIN_ID,
    name: 'Devnet bor (L2)',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: { default: { http: [L2_RPC_URL] } }
  });

  return {
    chain,
    account,
    publicClient: createPublicClient({ chain, transport: http(L2_RPC_URL) }),
    walletClient: createWalletClient({ account, chain, transport: http(L2_RPC_URL) })
  };
}
