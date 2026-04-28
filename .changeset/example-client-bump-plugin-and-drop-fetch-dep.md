---
'@polygonlabs/example-client': patch
---

Bump `@polygonlabs/zod-to-openapi-heyapi` to `^1.1.0` (narrowed audit + improved error messages) and drop the explicit `@hey-api/client-fetch` dependency. The fetch client's source is vendored into `@hey-api/openapi-ts`'s output — the explicit dep was unused and tripped a deprecation warning on every `pnpm install`. Generated client output is unchanged.
