---
'@polygonlabs/example-db': minor
'@polygonlabs/example-indexer': minor
'@polygonlabs/example-e2e': minor
'@polygonlabs/example-schemas': minor
'@polygonlabs/example-client': minor
'@polygonlabs/example-rest-api': minor
---

Add an indexer → shared-db → REST-API showcase built on the new canonical
`@polygonlabs/viem-event-watcher` package.

## What's new

- **`example-db`** — a Firestore-backed library exposing an `EventStore` of
  decoded on-chain events and a per-chain `CursorStore`. Zod schemas are the
  source of truth, applied as a Firestore converter so every read is validated
  at the boundary.
- **`example-indexer`** — a deployable service that drives
  `@polygonlabs/viem-event-watcher`'s `streamEvents` to consume a contract's
  logs and persist them to `example-db`, advancing the cursor to each scanned
  batch's high-water-mark. It owns the cursor, restart loop, and logging; the
  watcher uses `eth_getLogs` polling (not `watchEvent`) so log delivery is
  reliable on Polygon bor.
- **`example-e2e`** — an end-to-end suite that deploys a minimal event-emitter
  contract to a live kurtosis-pos bor devnet, emits events, runs the indexer,
  and asserts they land in `example-db` with the cursor advanced.

## Changed

- **`example-rest-api`** gains `GET /events`, serving the indexed events back
  out of `example-db` with optional filters and opaque-cursor pagination.
- **`example-schemas`** / **`example-client`** add the `IndexedEvent` /
  `EventList` schemas and the `listEvents` operation (spec + generated client
  regenerated).
