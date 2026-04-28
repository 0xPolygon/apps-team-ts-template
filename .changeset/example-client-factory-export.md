---
'@polygonlabs/example-client': minor
---

Add a `./factory` subpath export that surfaces hey-api's `createClient` / `createConfig` for advanced setups that need more than the singleton — multiple instances pointing at different base URLs, per-request config in SSR, a custom fetch adapter. Mirrors the pattern shipped by `@polygonlabs/bpn-rest-api` and `@polygonlabs/spol-api-client`.

```ts
import { getBlockNumber } from '@polygonlabs/example-client';
import { createClient, createConfig } from '@polygonlabs/example-client/factory';

const myClient = createClient(createConfig({ baseUrl, fetch: customFetch }));
await getBlockNumber({ client: myClient });
```

The default singleton `client` import remains the recommended path for typical apps.
