---
"example-rest-api": minor
---

Add `/api/block-number` endpoint demonstrating the correct ethers v6 provider pattern; introduce `RpcUrlSchema` for RPC URL env validation.

The endpoint returns the latest block number from the configured RPC. It demonstrates how to create and inject a provider at startup — never inside a request handler or retry loop — using `staticNetwork` to skip `eth_chainId` detection and avoid accumulating kernel socket buffers under load.

`RpcUrlSchema` validates `RPC_URL` at startup using `superRefine`. Error messages include the URL origin only, never the full URL (which may contain secret tokens in query parameters). `rpc.polygon.tools` is explicitly required to use `https://` because the host redirects `http://` with a 301 that ethers never follows, silently making the RPC appear unreachable.

New env vars: `RPC_URL` (required), `RPC_CHAIN_ID` (required).
