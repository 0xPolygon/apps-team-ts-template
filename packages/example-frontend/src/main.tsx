import './sentry';
import './globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { client } from '@polygonlabs/example-client';

import { App } from './app';
import { env } from './env';

// Configure the API client singleton at app entry — hey-api's generated
// SDK and TanStack Query factories all pull from this client, so a single
// setConfig call routes every API call to the configured base URL.
client.setConfig({ baseUrl: env.VITE_API_URL });

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
