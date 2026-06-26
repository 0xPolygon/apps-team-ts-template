# @polygonlabs/example-indexer

A blockchain event-indexing service — the **producer** half of the
indexer → db → REST showcase. It drives
[`@polygonlabs/viem-event-watcher`](https://www.npmjs.com/package/@polygonlabs/viem-event-watcher)'s
`streamEvents` to consume a contract's logs and persist them to
[`@polygonlabs/example-db`](../example-db); `example-rest-api` then serves them
back at `GET /events`.

## Why `getLogs` polling, not `watchEvent`

viem's `watchEvent` delivers logs **inconsistently on Polygon bor**. With HTTP
polling (the default), if the RPC advertises `eth_newFilter` viem opens a
server-side filter and polls it with `eth_getFilterChanges`, only falling back
to `eth_getLogs` when filters are entirely unsupported. bor advertises filter
support but its filters are unreliable — they silently stop returning new tip
logs — and because the failure is silent (no error, no end-of-stream), an
indexer keeps running while missing every new event.

`@polygonlabs/viem-event-watcher` is built entirely on `eth_getLogs` over
explicit block ranges — including a self-driven poll loop for the live tail
instead of `watchEvent`. Each call is a fresh, stateless request the node
either answers or rejects outright, so log delivery is consistent across RPCs
and any failure surfaces as a thrown error rather than silence. See the
package's README for the full rationale.

## What it does

- Builds one viem `PublicClient` (reused for the process lifetime) and drives
  `streamEvents({ client, address, events, fromBlock, batchSize, pollingInterval, signal })`.
- Decodes each log with a typed ABI tuple, so the consumer narrows on
  `event.eventName` and reads typed `event.args` — no topic-selector lookup.
- Writes each new log to `example-db`'s `EventStore` (deduping on
  `tx_hash` + `log_index`).
- Advances a per-chain `CursorStore` to **every** scanned batch's
  high-water-mark — including ranges with no matching logs — so a restart
  resumes from where the scan reached, not from the last event-bearing block.
- Owns the cursor, restart policy, and logging itself (the watcher deliberately
  owns none of them): a consumer-owned `AbortController` restart loop, and a
  single log at the restart boundary (`warn`, since the restart is the
  recovery).

## HTTP surface

- `GET /health-check` — Kubernetes liveness only.
- `GET /service-status` — operational metrics for Datadog Synthetics; reports
  the per-chain ingestion cursor read fresh from the store.

## Configuration

Env is validated at startup with `@t3-oss/env-core` + Zod (`src/env.ts`, lazy
`getEnv()`). The event ABI is a **code constant** (`src/config/events.ts`) — only
the contract address, chain, and scan window are environment-configurable. See
`.env.example`.

## Local development

```sh
# resolves workspace deps (example-db) to source via the @polygonlabs/source condition
pnpm --filter @polygonlabs/example-indexer run dev
```

Point `FIRESTORE_EMULATOR_HOST` at a local Firestore emulator to persist
without GCP credentials. The end-to-end behaviour — deploy a contract to a
local bor devnet, emit events, index them, assert they land in `example-db` —
is proven by [`@polygonlabs/example-e2e`](../example-e2e).
