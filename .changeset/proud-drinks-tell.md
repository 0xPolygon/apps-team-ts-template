---
'@polygonlabs/example-client': patch
---

Update `@hey-api/openapi-ts` to 0.97.3 to resolve a reported security advisory, and regenerate the client.

The regenerated fetch runtime restructures request/error handling internally (a single try/catch around the request lifecycle); the client's API surface is unchanged.
