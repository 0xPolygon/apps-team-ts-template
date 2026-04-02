import { createExampleQueryHooks } from '@polygonlabs/example-client/react';

import { env } from '../env';

const { useGetBlockNumber } = createExampleQueryHooks(env.VITE_API_URL);

export { useGetBlockNumber as useBlockNumber };
