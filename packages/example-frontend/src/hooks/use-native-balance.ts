import type { Address } from 'viem';

import { useBalance, useConnection } from 'wagmi';

export const useNativeBalance = (address: Address | undefined) => {
  const { chainId } = useConnection();
  const { data, isLoading, isError, error } = useBalance({
    address,
    chainId
  });

  return { data, isLoading, isError, error };
};
