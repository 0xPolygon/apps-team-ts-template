import { formatUnits } from 'viem';
import { useConnection } from 'wagmi';

import { useBlockNumber } from '../hooks/use-block-number';
import { useNativeBalance } from '../hooks/use-native-balance';
import { cn } from '../utils/cn';
import { shortenAddress } from '../utils/shorten-address';
import { NetworkSwitcher } from './network-switcher';
import { Card } from './ui/card';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-8">
    <span className="text-base text-grey">{label}</span>
    <span className="text-lg">{children}</span>
  </div>
);

export const WalletDetails = () => {
  const { address } = useConnection();
  const { data: balance, isLoading, isError } = useNativeBalance(address);
  const { data: blockData } = useBlockNumber();

  if (!address) return null;

  return (
    <Card className="w-full items-stretch gap-5">
      <h2 className="text-2xl font-semibold text-foreground">Wallet</h2>

      <div className="flex flex-col gap-4">
        <Row label="Address">{shortenAddress(address)}</Row>

        <Row label="Balance">
          <span className={cn(isLoading && 'animate-pulse text-grey', isError && 'text-red')}>
            {isLoading && '...'}
            {isError && 'Error'}
            {balance && `${formatUnits(balance.value, balance.decimals)} ${balance.symbol}`}
          </span>
        </Row>

        {blockData && <Row label="Block">{blockData.blockNumber.toLocaleString()}</Row>}

        <div className="border-t border-grey-light pt-4">
          <NetworkSwitcher />
        </div>
      </div>
    </Card>
  );
};
