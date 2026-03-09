'use client';

import type { ReactNode } from 'react';

import { WalletProvider } from '../context/wallet';

export const Providers = ({ children }: { children: ReactNode }) => {
  return <WalletProvider>{children}</WalletProvider>;
};
