---
"example-rest-api": patch
---

Harden RPC-failure handling in the template service.

- `NetworkService.get()` now triggers a fresh on-demand poll when both `state` and `activePoll` are empty, instead of throwing "no data and no active poll" for up to `intervalSecs` after a failed initial poll. Callers always either receive data or the real underlying fetch error.
- The global error handler sanitises ethers v6 fetch errors before anything reaches the HTTP response body or the log pipeline. The full request URL — including any `?token=<secret>` — was previously present in `err.message`, `err.stack`, and `err.info.requestUrl`; any of the three would have leaked the token to clients or Datadog. `info.requestUrl` is now reduced to the URL origin and the response uses the ethers `shortMessage`. Services built on this template inherit the fix for free.
- The docker-release trigger's `RPC_URL` now points at a tokenless public Ethereum endpoint (`ethereum-rpc.publicnode.com`) so the integration-test job doesn't depend on a repo-specific secret. Real services override the trigger's `env:` block with their own RPC configuration.
