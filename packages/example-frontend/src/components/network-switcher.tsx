import { polygonAmoy, sepolia } from 'viem/chains';
import { useConnection, useSwitchChain } from 'wagmi';

import { Button } from './ui/button';

const SUPPORTED_CHAINS = [sepolia, polygonAmoy] as const;

export const NetworkSwitcher = () => {
  const { chainId } = useConnection();
  const { mutate: switchChain, isPending } = useSwitchChain();

  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  const otherChain = SUPPORTED_CHAINS.find((c) => c.id !== chainId);

  if (!otherChain) return null;

  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-sm text-grey">
        Network:{' '}
        <span className="font-medium text-foreground">{currentChain?.name ?? 'Unknown'}</span>
      </span>
      <Button
        variant="primary"
        className="px-3 py-1 text-xs"
        onClick={() => switchChain({ chainId: otherChain.id })}
        disabled={isPending}
      >
        {isPending ? 'Switching...' : `Switch to ${otherChain.name}`}
      </Button>
    </div>
  );
};
