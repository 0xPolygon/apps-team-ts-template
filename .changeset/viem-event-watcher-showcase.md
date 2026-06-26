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
- **`example-rest-api`** now follows the four-layer test doctrine: unit and
  service-integration tests run together under the one `vitest.config.ts`
  (which owns the Firestore-emulator + Redis `globalSetup`), so `pnpm test`
  runs both on every PR. The separate `vitest.integration.config.ts`, the
  `tests/integration/` directory, and the `test:integration` /
  `test:*-integration` scripts are removed — the prior split was the
  antipattern the doctrine replaces. The config now excludes
  `tests/prod-smoke/**` so a bare `pnpm test` can never reach a deployed
  instance.
- **`example-rest-api`** gains the fourth test tier — a **prod-smoke** suite
  (`tests/prod-smoke/*.prod-smoke.test.ts` + `vitest.prod-smoke.config.ts`)
  that hits a deployed instance over HTTPS and validates each response against
  the route's own Zod schema (`HealthCheckResponse`, `EventList`). It runs only
  via the new `test:prod-smoke` / `test:dev-smoke` scripts, never in CI, and
  skips cleanly when the target URL is unset — so the template now demonstrates
  all four test tiers (unit, service-integration, e2e, prod-smoke).
