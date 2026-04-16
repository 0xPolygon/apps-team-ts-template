import type { PublicClient } from 'viem';

import { useEffect, useState } from 'react';
import { useConnection, useConnectionEffect, usePublicClient } from 'wagmi';

const SEQUENCE_V3_CONNECTOR_ID = 'sequence-v3-wallet';
const EIP_7702_BYTECODE_PREFIX = '0xef0100';

// -- Sequence v3 provider type guard ------------------------------------------

interface WalletTransactionProvider {
  setUseWalletTransactionForSend: (enabled: boolean) => void;
}

const supportsWalletTransactionForSend = (
  provider: unknown
): provider is WalletTransactionProvider =>
  typeof provider === 'object' &&
  provider !== null &&
  'setUseWalletTransactionForSend' in provider &&
  typeof (provider as Record<string, unknown>).setUseWalletTransactionForSend === 'function';

// -- Hook ---------------------------------------------------------------------

/**
 * Handles Sequence v3 provider configuration and smart contract wallet detection.
 *
 * On connect, if the wallet is Sequence v3, calls `setUseWalletTransactionForSend(true)`
 * so transactions route through the wallet's native path instead of the permissioned
 * session flow.
 *
 * Detects smart contract wallets via on-chain bytecode check, excluding Sequence v3
 * (behaves like an EOA) and EIP-7702 delegated EOAs.
 *
 * Usage:
 *   const { address, isConnected } = useConnection();   // wagmi — not wrapped
 *   const { isSmartContractWallet, isSequenceWallet } = useWallet(address);
 *
 *   // SCW modals/warnings:       isSmartContractWallet && !isSequenceWallet
 *   // Approve instead of permit: isSmartContractWallet || isSequenceWallet
 */
export const useWallet = (address: string | undefined) => {
  const { connector } = useConnection();
  const publicClient = usePublicClient();
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false);

  const isSequenceWallet = connector?.id === SEQUENCE_V3_CONNECTOR_ID;

  // Configure Sequence v3 provider on connect.
  useConnectionEffect({
    onConnect({ connector: connected }) {
      if (connected.id !== SEQUENCE_V3_CONNECTOR_ID) return;

      void connected
        .getProvider()
        .then((provider) => {
          if (supportsWalletTransactionForSend(provider)) {
            provider.setUseWalletTransactionForSend(true);
          }
        })
        .catch((error: unknown) => {
          console.error('Failed to configure Sequence v3 wallet transaction sending:', error);
        });
    }
  });

  // Detect smart contract wallets via on-chain bytecode.
  useEffect(() => {
    if (!address || !publicClient) {
      setIsSmartContractWallet(false);
      return;
    }

    const detect = async (client: PublicClient) => {
      try {
        const bytecode = await client.getCode({ address: address as `0x${string}` });
        const hasCode =
          bytecode !== undefined &&
          bytecode !== '0x' &&
          !bytecode.toLowerCase().startsWith(EIP_7702_BYTECODE_PREFIX);
        setIsSmartContractWallet(hasCode);
      } catch {
        setIsSmartContractWallet(false);
      }
    };

    void detect(publicClient);
  }, [address, publicClient]);

  return { isSmartContractWallet, isSequenceWallet };
};
