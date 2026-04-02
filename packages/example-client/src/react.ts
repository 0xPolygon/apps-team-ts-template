import type { UseQueryOptions } from '@tanstack/react-query';

import { useQuery } from '@tanstack/react-query';

import { createExampleClient } from './index.ts';

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

/** Options for a useQuery hook, without queryKey/queryFn (those are set internally). */
type QueryOpts<F extends () => Promise<unknown>> = Omit<
  UseQueryOptions<Awaited<ReturnType<F>>>,
  'queryKey' | 'queryFn'
>;

/**
 * Creates TanStack Query hooks for the Example REST API.
 *
 * @example
 * const hooks = createExampleQueryHooks('https://api.example.com');
 * const { data } = hooks.useGetBlockNumber();
 */
export function createExampleQueryHooks(baseUrl: string) {
  const client = createExampleClient(baseUrl);
  type C = typeof client;

  return {
    useGetHealthCheck: (options?: QueryOpts<C['getHealthCheck']>) =>
      useQuery({
        queryKey: ['example-api', 'health-check'] as const,
        queryFn: () => client.getHealthCheck(),
        ...options
      }),

    useGetHello: (options?: QueryOpts<C['getHello']>) =>
      useQuery({
        queryKey: ['example-api', 'hello'] as const,
        queryFn: () => client.getHello(),
        ...options
      }),

    useGetBlockNumber: (options?: QueryOpts<C['getBlockNumber']>) =>
      useQuery({
        queryKey: ['example-api', 'block-number'] as const,
        queryFn: () => client.getBlockNumber(),
        ...options
      })
  };
}

export type ExampleQueryHooks = ReturnType<typeof createExampleQueryHooks>;
