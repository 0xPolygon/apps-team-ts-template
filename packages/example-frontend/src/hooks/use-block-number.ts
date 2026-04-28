import { useQuery } from '@tanstack/react-query';

import { getBlockNumberOptions } from '@polygonlabs/example-client/react';

// Re-export under a domain-friendly name so call sites read as
// `useBlockNumber()` rather than the longer hey-api factory call. The factory
// pulls the baseUrl from the singleton client configured in `main.tsx`.
export const useBlockNumber = () => useQuery(getBlockNumberOptions());
