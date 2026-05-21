import { usePolygonWallet } from '@polygonlabs/wallet-kit';

import { CodecTest } from './codec-test';
import { ScwBanner } from './scw-banner';
import { SendNative } from './send-native';
import { Button } from './ui/button';
import { WalletDetails } from './wallet-details';

export const HomeContent = () => {
  const { isConnected, isExternalSmartContractWallet, connect, disconnect } = usePolygonWallet();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-grey-light px-6 py-4">
        <h1 className="text-3xl font-medium tracking-wide text-grey">Frontend Template</h1>
        <Button
          variant={isConnected ? 'danger' : 'primary'}
          onClick={isConnected ? disconnect : connect}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </header>

      <main className="flex flex-1 justify-center px-6 pt-10">
        <div className="flex w-full max-w-lg flex-col gap-6">
          <CodecTest />
          {isConnected ? (
            <>
              {isExternalSmartContractWallet && <ScwBanner />}
              <WalletDetails />
              <SendNative />
            </>
          ) : (
            <p className="text-grey">Connect a wallet to get started.</p>
          )}
        </div>
      </main>
    </div>
  );
};
