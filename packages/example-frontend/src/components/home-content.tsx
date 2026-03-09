'use client';

import { WalletPanel } from './wallet-panel';

export const HomeContent = () => {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold">Example Frontend</h1>
        <WalletPanel />
      </div>
    </main>
  );
};
