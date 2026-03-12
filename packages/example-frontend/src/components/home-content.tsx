import { useConnection, useDisconnect } from 'wagmi';

import { useOpenConnectModal } from '@0xsequence/connect';

import { Button } from './ui/button';
import { WalletDetails } from './wallet-details';

export const HomeContent = () => {
  const { isConnected } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const { setOpenConnectModal } = useOpenConnectModal();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-grey-light px-6 py-4">
        <h1 className="text-3xl font-medium tracking-wide text-grey">Frontend Template</h1>
        <Button
          variant={isConnected ? 'danger' : 'primary'}
          onClick={isConnected ? () => disconnect() : () => setOpenConnectModal(true)}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </header>

      <main className="flex flex-1 justify-center px-6 pt-10">
        {isConnected ? (
          <WalletDetails />
        ) : (
          <p className="text-grey">Connect a wallet to get started.</p>
        )}
      </main>
    </div>
  );
};
