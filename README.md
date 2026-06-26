# apps-team-ts-template

[![CI](https://github.com/0xPolygon/apps-team-ts-template/actions/workflows/ci-trigger.yml/badge.svg)](https://github.com/0xPolygon/apps-team-ts-template/actions/workflows/ci-trigger.yml)
[![Release](https://github.com/0xPolygon/apps-team-ts-template/actions/workflows/npm-release-trigger.yml/badge.svg)](https://github.com/0xPolygon/apps-team-ts-template/actions/workflows/npm-release-trigger.yml)
[![Docker release](https://github.com/0xPolygon/apps-team-ts-template/actions/workflows/docker-release-trigger.yml/badge.svg)](https://github.com/0xPolygon/apps-team-ts-template/actions/workflows/docker-release-trigger.yml)

Monorepo template for Polygon Apps Team TypeScript services. Implements the
three-package schemas/service/client pattern with build-free local development.

## Packages

| Package | Description |
|---------|-------------|
| `packages/example-schemas` | Zod response schemas, OpenAPI registry, committed `openapi.json` |
| `packages/example-client` | hey-api-generated fetch SDK and TanStack Query options factories |
| `packages/example-rest-api` | Express REST API service with Dockerfile |
| `packages/example-frontend` | React + Vite frontend using the client package |
| `packages/example-db` | Firestore-backed typed stores (`EventStore`, `CursorStore`) shared by the indexer and the REST API |
| `packages/example-indexer` | Event-indexing service driving `@polygonlabs/viem-event-watcher` → `example-db` |
| `packages/example-e2e` | End-to-end suite: index a contract's events off a live kurtosis-pos devnet and assert they land in `example-db` |

All packages are private — this repo is a reference implementation, not a publishable library.

## What's Included

- **pnpm workspaces** — topological build ordering; no manual sequencing
- **TypeScript** — native Node 24 execution via `@tsconfig/node24` + `@tsconfig/node-ts`
- **Build-free local development** — custom export conditions (`source`/`types`/`import`)
  mean `typecheck`, `lint`, and `dev` all work from a fresh checkout with no build step
- **`@hey-api/openapi-ts` + `@polygonlabs/zod-to-openapi-heyapi`** — registry-driven codegen
  emits a typed fetch SDK whose response transformers run the same Zod schemas the backend
  validates against, so codecs (`Int64Codec`, `IsoDateCodec`, …) round-trip end-to-end
- **`@polygonlabs/openapi-registry` + `@polygonlabs/express`** — single source of truth for
  routes, request/response validation, declarative `.auth(...)` binding, and the served
  OpenAPI doc; handlers are exhaustively bound at compile time
- **ESLint** — flat config via `@polygonlabs/apps-team-lint`
- **Prettier** — formatting (markdown handled by markdownlint-cli2)
- **Vitest** — test runner with `ssr.resolve.conditions` / `resolve.conditions` configured
  so tests resolve workspace library source without building `dist/`
- **Husky** — pre-commit (lint-staged) and pre-push (changeset check) hooks
- **Changesets** — versioning, changelog, and npm publishing
- **Environment validation** — `@t3-oss/env-core` + Zod per package

## Getting Started

```bash
# Install all dependencies
pnpm install

# Copy environment files
cp packages/example-rest-api/.env.example packages/example-rest-api/.env

# Start the service (no build needed)
pnpm --filter @polygonlabs/example-rest-api run dev

# Start the frontend (no build needed)
pnpm --filter @polygonlabs/example-frontend run dev
```

## Scripts

### Root (whole-repo)

| Script | Description |
|--------|-------------|
| `pnpm run lint` | ESLint + markdownlint + Prettier + typecheck (parallel) |
| `pnpm run format` | Auto-fix all lint and formatting in-place |
| `pnpm run typecheck` | Type-check all packages (no build required) |
| `pnpm test` | Run tests across all packages |
| `pnpm run build` | Build all packages in topological order |
| `pnpm run clean` | Delete `dist/`, `node_modules/`, generated files across all packages |

### Per-package

| Script | Description |
|--------|-------------|
| `pnpm --filter <name> run dev` | Start in development mode |
| `pnpm --filter <name> run test` | Run tests |
| `pnpm --filter <name> run typecheck` | Type-check single package |
| `pnpm --filter <name> run build` | Compile to `dist/` |
| `pnpm --filter <name> run clean` | Remove build artifacts and node_modules |

## Service Architecture

`example-rest-api` demonstrates the team-standard service shape end-to-end. The interesting
patterns:

**Registry-driven router with auth** (`src/server.ts`, `src/handlers/`):
The route manifest is the `TypedRegistry` exported by `@polygonlabs/example-schemas`. Wiring
it up reads as one expression:

```ts
const registry = buildRegistry();
const router = createRegistryRouter({ registry })
  .auth(buildAuthHandlers(env))           // x-api-key check; runs before validation
  .implement(buildStaticHandlers())
  .implement(buildNetworkHandlers({ blockNumberService, getBlock }))
  .implement(buildMessageHandlers(messageStore))
  .toExpress();
```

`.implement(...)` is type-exhaustive — a missing handler is a TypeScript error at this call
site, not a 404 at request time. `.auth(...)` is required when the registry has security
schemes; operations declaring `security: [{ ApiKeyAuth: [] }]` route through the auth
handler before the request validator runs (an unauthenticated request never decodes the
codec, never parses the body). `getBlockMetadata` is the worked example of an auth-gated
codec-on-path endpoint — see `packages/example-schemas/src/routes/blocks.ts` and
`packages/example-rest-api/src/handlers/network.ts`.

`createErrorHandler` and `notFoundHandler` from `@polygonlabs/express` provide the standard
`{ error: true, message, info? }` body shape, mapped from `HTTPError.statusCode`. Service
code throws `NotAuthenticated` / `Conflict` / `NotFound` from `@polygonlabs/verror`; the
canonical wire shape comes from `@polygonlabs/openapi-registry/error-schemas` and is
re-exported from `@polygonlabs/example-schemas` so route definitions can reference it
without taking a transitive dep on the framework runtime.

Beyond the registry router:

**Background polling with `NetworkService<T>`** (`src/services/NetworkService.ts`):
Rather than calling the RPC on every request, the service polls on a fixed interval and
caches the result. `get()` returns the cached value immediately if available, or awaits
the in-flight initial poll — the first request waits at most one RPC round-trip, all
subsequent requests are served from cache with no latency.

```text
listen()
  → NetworkService<number> created (fires first poll immediately)
  → Cron polls every 5s, updates cache
GET /api/block-number
  → blockNumberService.get() returns cached value (or awaits first poll)
  → res.json({ blockNumber })
```

**`createServer(logger)` and `serverEvents`** (`src/server.ts`):
The server is created via `createServer(logger)`, which internalises provider creation and
wires service lifecycle to the HTTP server. `serverEvents` emits `cronRegistered` after
`listen()` so test helpers or other consumers can capture the cron handle.

**Test helper pattern** (`tests/helpers/agent.ts`, `tests/env.ts`):
`getAgent()` returns `{ agent, baseUrl }` — a supertest agent and the URL it targets.
When `TEST_BASE_URL` is set the same tests run against a deployed instance (e.g. a Docker
container). The server is started once on `listen(0)` and reused for the file's lifetime.

## Event-indexing Showcase (indexer → db → REST API)

A second worked example wires three packages around the new canonical
[`@polygonlabs/viem-event-watcher`](https://www.npmjs.com/package/@polygonlabs/viem-event-watcher),
demonstrating a shared-persistence pattern where two services agree on a schema neither owns:

```text
on-chain logs
  → example-indexer   drives viem-event-watcher's streamEvents (eth_getLogs polling,
                      not watchEvent — reliable on Polygon bor), decodes each log, and
                      writes it to ↓
  → example-db        Firestore-backed EventStore (+ per-chain CursorStore); Zod schemas
                      are the source of truth, applied as a Firestore converter ↑↓
  → example-rest-api  GET /events reads the same EventStore back out, newest-first, with
                      filters and opaque-cursor pagination, served via the codegen client
```

`example-db` lives in its own package precisely so the schema is defined once and the indexer
(writer) and REST API (reader) depend on the same validated types without either owning the
other's view. See each package's README for the details — in particular
`packages/example-indexer/README.md` on **why `getLogs` polling instead of `watchEvent`**.

## Testing — the four-layer doctrine

This template is a worked instance of the team's four-layer test doctrine; it does not
re-explain it. Read the doctrine itself in
[`apps-team-ops/docs/best-practices/testing.md`](https://github.com/0xPolygon/apps-team-ops/blob/main/docs/best-practices/testing.md).
A test's tier is decided by **what real thing it touches**:

| Tier | Touches | Where | Run by |
|------|---------|-------|--------|
| **Unit** | nothing | each service's `tests/*.test.ts` | `pnpm test` (every PR) |
| **Service integration** | the service's own data deps (Firestore emulator, Redis) | **mixed with unit** in `tests/*.test.ts`, under the one `vitest.config.ts` | `pnpm test` (every PR) |
| **e2e** | the real external world (the chain, via kurtosis) | `packages/example-e2e`, `*.e2e.test.ts` | opt-in (`run-e2e` label / `workflow_dispatch`) |
| **Prod-smoke** | a deployed instance over HTTPS | a service's `tests/prod-smoke/` | manual; never CI |

The load-bearing rules the template demonstrates:

- **Unit + service-integration share one `vitest.config.ts`** per service — `example-rest-api`'s
  config owns the Firestore-emulator + Redis `globalSetup`, and resource clients are built
  lazily so the unit subset never opens a connection. There is **no** `vitest.integration.config.ts`
  and **no** `tests/integration/` directory — that split is the antipattern the doctrine removed.
- **e2e is the only tier behind kurtosis.** `example-e2e` indexes a contract's events off a live
  bor devnet and asserts they reach `example-db`; it has a `test:e2e` script but **no `test`
  script**, so `pnpm -r run test` skips it. It is a worked instance of **Path A — reuse lst-api's
  published GHCR snapshot** in the
  [kurtosis-e2e handbook](https://github.com/0xPolygon/apps-team-ops/blob/main/docs/best-practices/kurtosis-e2e-stack.md);
  see `packages/example-e2e/README.md` for the run commands.
- **Tiers don't leak across packages** — no service depends on the e2e package, and the e2e
  package wires services together through their production factories only.

## How the Three-Package Pattern Works

```text
packages/example-schemas/src/          — Zod schemas + TypedRegistry composition
    ↓ pnpm run build
packages/example-schemas/openapi.json  — committed spec, derived from the registry
    ↓ pnpm --filter example-client run generate
packages/example-client/src/generated/ — committed hey-api output, importing the
                                          actual Zod schemas from example-schemas
    ↓ import { getBlockMetadata, ... } from '@polygonlabs/example-client'
packages/example-rest-api/tests/        — tests assert against the typed SDK
packages/example-frontend/src/hooks/   — React hooks via the TanStack Query factories
```

`openapi.json` and `src/generated/` are both committed so that spec changes produce
reviewable diffs and CI can detect drift.

The same `TypedRegistry` instance feeds the served spec **and** the runtime router:
`createRegistryRouter({ registry })` from `@polygonlabs/express/registry` derives every
mounted route from the registry, so a route is registered exactly once and the spec, the
router, and the typed handler binding can never disagree.

## Build-free Local Development

Workspace library packages export a `source` condition pointing to `.ts` source alongside
the compiled `dist/` targets. Combined with `customConditions: ["@polygonlabs/source"]` in `tsconfig.json`
and `--conditions @polygonlabs/source` in dev scripts, this means:

- `pnpm run typecheck` — works on a fresh checkout with no `dist/`
- `pnpm run lint` — works on a fresh checkout with no `dist/`
- `pnpm run dev` — starts immediately; editing a library file is reflected in the running
  service without any rebuild or watcher

Docker is the only context that requires a build, because `pnpm deploy` creates real
`node_modules/` copies where Node 24 does not apply type stripping. The Dockerfile runs
`pnpm run build` (topological) before `pnpm deploy`.

## After Cloning This Template

1. Rename packages: `example-schemas` → `<service>-schemas`, `example-client` → `<service>-client`, `example-rest-api` → `<service>`, `example-frontend` → your frontend name (or delete if not needed). Keep every package — deployables included — under the `@polygonlabs/` scope: the docker-test composite strips the scope when deriving the image name, and `pnpm --filter` matches a scoped package by its unscoped name. The docker-release trigger matches all changeset tags generically and the shared tooling skips packages without a Dockerfile — there is no per-package tag list to maintain
2. Update `package.json` `name` fields and the root workspace `name`
3. Replace example Zod schemas and routes with your actual API surface
4. Update `src/env.ts` in each package for your environment variables
5. Update `.env.example` files
6. Update this `README.md` and `CLAUDE.md`
7. Update the `repo` in `.changeset/config.json`'s `changelog` entry to `0xPolygon/<your-repo>` so changelog PR and commit links point at your repository
8. Register the repo in `polygon-infrastructure` for OIDC if it will deploy via Docker release pipeline
