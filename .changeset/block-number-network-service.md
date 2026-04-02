---
"example-rest-api": patch
---

Replace the per-request RPC call on `/api/block-number` with a background polling service.

`NetworkService<T>` polls the RPC every 5 seconds using a croner job and caches the result
in memory. The route handler calls `service.get()` which returns the cached value immediately
if available, or awaits the in-flight initial poll — so the first request never blocks longer
than one RPC round-trip and subsequent requests are served from cache with no RPC latency.

`server.ts` now exports `createServer(logger)` instead of `getExpressApp(logger, provider)`,
internalising provider creation and wiring the NetworkService lifecycle to the http.Server.
`serverEvents` emits `cronRegistered` after `listen()` so subscribers can capture the cron
handle. `tests/helpers/agent.ts` and `tests/env.ts` follow the pos-airdrop pattern:
`getAgent()` returns `{ agent, baseUrl }` with the server started once and reused across
all tests in the file.
