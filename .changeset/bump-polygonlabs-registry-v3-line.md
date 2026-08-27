---
'@polygonlabs/example-schemas': patch
'@polygonlabs/example-client': patch
'@polygonlabs/example-frontend': patch
'@polygonlabs/example-rest-api': patch
'@polygonlabs/example-indexer': patch
---

Adopt the registry-v3 package line

Bumps `@polygonlabs/openapi-registry` to ^3.0.0 (generate-time rejection of coercing parameter schemas; configurable standard-error injection), `@polygonlabs/zod-codecs` to ^1.2.0 (`SafeIntegerCodec`), `@polygonlabs/zod-to-openapi-heyapi` to ^2.0.4 (2xx schema violations now surface as `ResponseValidationError`), and `@polygonlabs/express` to ^5.0.0 (registry v3 peer). Generated output is unchanged — the codec-based query parameters landed in the companion change.
