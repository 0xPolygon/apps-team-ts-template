---
'@polygonlabs/example-client': patch
---

Update `@hey-api/openapi-ts` to 0.97.3 to resolve a reported security advisory, align `@polygonlabs/zod-to-openapi-heyapi` to 2.0.3, and regenerate the client.

The regenerated fetch runtime restructures request/error handling internally (a single try/catch around the request lifecycle); the client's API surface is unchanged, and the generated output is byte-identical under the updated plugin.
