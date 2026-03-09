import type { Address } from 'viem';

import { useBalance } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export const useEthBalance = (address: Address | undefined) => {
  const { data, isLoading, isError, error } = useBalance({
    address,
    chainId: sepolia.id
  });

  return { data, isLoading, isError, error };
};
