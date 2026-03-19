import * as Sentry from '@sentry/react';
import { polygonAmoy, sepolia } from 'viem/chains';

import { SequenceConnect, createConfig } from '@0xsequence/connect';

import { HomeContent } from './components/home-content';
import { env } from './env';

const sequenceConfig = createConfig('waas', {
  projectAccessKey: env.VITE_SEQUENCE_PROJECT_ACCESS_KEY,
  waasConfigKey: env.VITE_SEQUENCE_WAAS_KEY,
  signIn: { projectName: 'Example Frontend' },
  defaultChainId: sepolia.id,
  chainIds: [sepolia.id, polygonAmoy.id],
  appName: 'Example Frontend',
  email: false,
  coinbase: true,
  metaMask: true,
  wagmiConfig: {
    multiInjectedProviderDiscovery: true
  },
  renderInline: true
});

export const App = () => (
  <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
    <SequenceConnect config={sequenceConfig}>
      <HomeContent />
    </SequenceConnect>
  </Sentry.ErrorBoundary>
);
