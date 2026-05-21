import * as Sentry from '@sentry/react';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { polygon, polygonAmoy, sepolia } from 'viem/chains';

import { WalletKitProvider } from '@polygonlabs/wallet-kit';

import { HomeContent } from './components/home-content';
import { env } from './env';
import { reportApiError } from './lib/report-api-error';

// `@polygonlabs/zod-to-openapi-heyapi`'s codec-aware factories pre-encode
// codec slots (`bigint`, `Date`) into wire-shape strings before they reach
// the queryKey, so the default `JSON.stringify`-based `queryKeyHashFn` is
// already safe — no per-QueryClient override needed.
//
// Every query / mutation error flows through `reportApiError`, which uses
// the cross-client `categorizeApiError` from
// `@polygonlabs/zod-to-openapi-heyapi/errors` to tag the Sentry event by
// failure category (`transport` / `unknown` / `native-error` / `other`).
// One reporter, every API error path covered. The query-level handler
// fires for hook errors (factory queryFn rejections); the mutation-level
// handler fires for `useMutation({ mutationFn })` rethrows from the
// imperative wrapper. `meta.operation` gives the reporter a stable tag
// per-call site without leaking through the wrapper return type.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) =>
      reportApiError(error, {
        operation: typeof query.meta?.operation === 'string' ? query.meta.operation : undefined,
        extra: { queryKey: query.queryKey }
      })
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) =>
      reportApiError(error, {
        operation:
          typeof mutation.meta?.operation === 'string' ? mutation.meta.operation : undefined
      })
  })
});

export const App = () => (
  <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
    <WalletKitProvider
      queryClient={queryClient}
      sequence={{
        projectAccessKey: env.VITE_SEQUENCE_PROJECT_ACCESS_KEY,
        walletUrl: env.VITE_SEQUENCE_WALLET_URL,
        dappOrigin: env.VITE_DAPP_ORIGIN,
        signIn: { projectName: 'Example Frontend' },
        defaultChainId: sepolia.id,
        chainIds: [sepolia.id, polygon.id, polygonAmoy.id],
        appName: 'Example Frontend',
        walletConnect: env.VITE_WALLET_CONNECT_PROJECT_ID
          ? { projectId: env.VITE_WALLET_CONNECT_PROJECT_ID }
          : undefined,
        wagmiConfig: {
          multiInjectedProviderDiscovery: true
        }
      }}
      onProviderError={(error) => Sentry.captureException(error)}
    >
      <HomeContent />
    </WalletKitProvider>
  </Sentry.ErrorBoundary>
);
