'use client';

import { formatUnits } from 'viem';

import { useWallet } from '../context/wallet';
import { useEthBalance } from '../hooks/use-eth-balance';
import { cn } from '../utils/cn';
import { shortenAddress } from '../utils/shorten-address';
import { Button } from './ui/button';
import { Card } from './ui/card';

export const WalletPanel = () => {
  const { address, isConnected, connect, disconnect } = useWallet();
  const { data: balance, isLoading, isError } = useEthBalance(address);

  return (
    <Card>
      <h2 className="text-xl font-semibold">
        {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
      </h2>

      {isConnected && address && (
        <>
          <p className="font-mono text-sm">{shortenAddress(address)}</p>
          <p
            className={cn(
              'text-sm',
              isLoading && 'animate-pulse text-grey',
              isError && 'text-red',
              !isLoading && !isError && 'text-foreground'
            )}
          >
            {isLoading && 'Loading balance...'}
            {isError && 'Failed to load balance'}
            {balance &&
              `Balance: ${formatUnits(balance.value, balance.decimals)} ${balance.symbol}`}
          </p>
        </>
      )}

      <Button
        variant={isConnected ? 'danger' : 'primary'}
        onClick={isConnected ? disconnect : connect}
      >
        {isConnected ? 'Disconnect' : 'Connect'}
      </Button>
    </Card>
  );
};
