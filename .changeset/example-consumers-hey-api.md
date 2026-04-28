---
'example-rest-api': patch
'example-frontend': patch
---

Switch the integration tests and the block-number hook to the hey-api SDK shape: SDK functions return `{ data, error, ... }`; the singleton client is configured once via `client.setConfig({ baseUrl })` at app entry. The block-number wire field is now an `Int64Codec` digit string that the generated transformer decodes to `bigint` — callers receive `data.blockNumber: bigint`.
