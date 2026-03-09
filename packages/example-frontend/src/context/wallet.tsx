'use client';

import type { ReactNode } from 'react';
import type { Address } from 'viem';

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { sepolia } from '@reown/appkit/networks';
import { createAppKit, useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { WagmiProvider } from 'wagmi';

import { env } from '../env';

const projectId = env.NEXT_PUBLIC_REOWN_PROJECT_ID;

const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks: [sepolia]
});

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [sepolia],
  defaultNetwork: sepolia,
  features: {
    socials: false,
    email: false,
    swaps: false
  }
});

type WalletContextValue = {
  address: Address | undefined;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue>({
  address: undefined,
  isConnected: false,
  connect: () => {},
  disconnect: () => {}
});

const WalletProviderInternal = ({ children }: { children: ReactNode }) => {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { status, address } = useAppKitAccount();

  const value = useMemo<WalletContextValue>(
    () => ({
      address: status === 'connected' && address && isAddress(address) ? address : undefined,
      isConnected: status === 'connected',
      connect: () => open({ view: 'Connect' }),
      disconnect
    }),
    [status, address, open, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProviderInternal>{children}</WalletProviderInternal>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export const useWallet = () => useContext(WalletContext);
