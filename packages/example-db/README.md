# @polygonlabs/example-db

Firestore-backed typed stores for the **indexer → db → REST** showcase. It is
the shared persistence layer between two services in this monorepo:

- **`example-indexer`** writes decoded on-chain logs (`EventStore.createEvent`)
  and advances a per-chain ingestion cursor (`CursorStore`).
- **`example-rest-api`** reads those logs back out (`EventStore.listEvents`)
  and serves them at `GET /events`.

Keeping the stores in their own package — rather than inside either service —
is the point of the example: the schema is defined once, both services depend
on the same validated types, and neither owns the other's view of the data.

## What it exposes

- **`EventStore`** — `createEvent`, `findByTxHashAndLogIndex` (dedup), and a
  paginated, newest-first `listEvents` with optional `chain` / `contractAddress`
  / `eventName` filters.
- **`CursorStore`** — `getLastProcessedBlock` / `setLastProcessedBlock`, one
  document per chain.
- **Zod schemas** (`IndexedEventSchema`, `EventCursorSchema`) as the source of
  truth, applied as a Firestore data converter so every read is validated at
  the boundary.

## Conventions worth copying

- **Storage-facing shape.** `IndexedEvent` is `snake_case` with JSON-safe
  primitives — `bigint` block numbers and event args are narrowed to
  `number`/`string` because Firestore has no bigint type and the data is served
  as JSON downstream. The off-chain storage shape is deliberately *not* a mirror
  of viem's `Log`.
- **Network-namespaced collections** (`example_events_<network>`) so one project
  holds mainnet / testnet / local data without collisions.
- **`@polygonlabs/source` exports** for build-free local development: services
  resolve `./src` via the custom condition during `dev`/test, and the published
  `dist/` via the default `import` condition. `publishConfig.exports` strips the
  `@polygonlabs/source` condition so a published package never leaks its source
  entry — the exact footgun that shipped broken in another package's `1.0.0`.

## Local development

No build step is needed locally — consumers resolve `./src` through the
`@polygonlabs/source` condition. Run `pnpm run build` only to produce the
`dist/` bundle a Docker image (or an npm publish) consumes.
