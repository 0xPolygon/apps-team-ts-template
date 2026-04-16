import * as Sentry from '@sentry/react';
import { polygon, polygonAmoy, sepolia } from 'viem/chains';

import { SequenceConnect, createConfig } from '@0xsequence/connect';

import { HomeContent } from './components/home-content';
import { env } from './env';

const sequenceConfig = createConfig({
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
});

export const App = () => (
  <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
    <SequenceConnect config={sequenceConfig}>
      <HomeContent />
    </SequenceConnect>
  </Sentry.ErrorBoundary>
);
