---
'example-rest-api': minor
'@polygonlabs/example-schemas': minor
'@polygonlabs/example-client': minor
---

Add a canonical "managed local resource" integration-test example: a cache-aside widget read path where Firestore is the source of truth and Redis is a lookaside cache in front of it.

## What's new

- `GET /api/widgets/{id}` — registry-driven route returning a `Widget`, served via the codegen client. The handler delegates to a `WidgetService` doing cache-aside (Redis hit → return; miss → Firestore → populate cache), and throws `NotFound` for an unknown id.
- `src/redis.ts` (single-node ioredis, `enableOfflineQueue: false`, `host:port` parse) and `src/firestore.ts` (emulator-aware client). Both clients are built lazily on first widget request so the hermetic unit suite never connects.
- New env: `REDIS_URL`, `REDIS_CLUSTER`, `FIRESTORE_EMULATOR_HOST`, `GOOGLE_CLOUD_PROJECT_ID` (validated in `src/env.ts`).

## The point — one globalSetup owns BOTH resources

`vitest.globalSetup.ts` stands up a Firestore emulator AND Redis from one place and shows both discovery styles: Redis via an explicit `REDIS_URL`, Firestore via the SDK-detected `FIRESTORE_EMULATOR_HOST`. Both publish on EPHEMERAL host ports (discovered with `docker compose port`) so concurrent suites never collide on a fixed port. A single gate decides whether to manage Docker, defer to externally-provided resources (CI), or skip for a URL target. Firestore state is cleared per-test (`beforeEach`) for order-independence; the cache isn't, illustrating the stateful-store-vs-cache distinction.

Split configs: `vitest.config.ts` stays hermetic (excludes `tests/integration/**`); `vitest.integration.config.ts` carries the globalSetup; `test = test:unit && test:integration`. `.env.test` is committed and non-secret — the `demo-*` Firestore project and Redis need no credentials, so a fresh clone runs `pnpm test` with no setup.

The `@polygonlabs/example-schemas` and `@polygonlabs/example-client` packages gain the `Widget` schema and the generated `getWidget` client.
