---
"example-rest-api": minor
---

Add `parseRpcUrlArray` helper for services that need multiple RPC endpoints with retry/failover.

`parseRpcUrlArray` parses a JSON-encoded string array and validates each element with `RpcUrlSchema`. Use it as a `.transform()` callback for env vars that hold multiple RPC endpoints. The optional `RPC_URLS` env var in the example schema demonstrates the pattern.
