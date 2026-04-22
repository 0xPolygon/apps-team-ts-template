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
| `packages/example-client` | Orval-generated fetch client and TanStack Query hooks |
| `packages/example-rest-api` | Express REST API service with Dockerfile |
| `packages/example-frontend` | React + Vite frontend using the client package |

All packages are private — this repo is a reference implementation, not a publishable library.

## What's Included

- **pnpm workspaces** — topological build ordering; no manual sequencing
- **TypeScript** — native Node 24 execution via `@tsconfig/node24` + `@tsconfig/node-ts`
- **Build-free local development** — custom export conditions (`source`/`types`/`import`)
  mean `typecheck`, `lint`, and `dev` all work from a fresh checkout with no build step
- **Orval** — generates a typed fetch client and React hooks from the committed `openapi.json`
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
pnpm --filter example-rest-api run dev

# Start the frontend (no build needed)
pnpm --filter example-frontend run dev
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

`example-rest-api` demonstrates two patterns beyond the basic Express setup:

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

## How the Three-Package Pattern Works

```text
packages/example-schemas/src/          — Zod schemas + OpenAPI registry
    ↓ pnpm run build
packages/example-schemas/openapi.json  — committed spec, consumed by orval
    ↓ pnpm --filter example-client run generate
packages/example-client/src/generated/ — committed orval output
    ↓ createExampleClient(baseUrl)
packages/example-client/src/index.ts   — typed facade
    ↓ import { createExampleClient } from '@polygonlabs/example-client'
packages/example-rest-api/tests/        — tests assert against the client
packages/example-frontend/src/hooks/   — React hooks via createExampleQueryHooks()
```

`openapi.json` and `src/generated/` are both committed so that spec changes produce
reviewable diffs and CI can detect drift.

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

1. Rename packages: `example-schemas` → `<service>-schemas`, `example-client` → `<service>-client`, `example-rest-api` → `<service>`, `example-frontend` → your frontend name (or delete if not needed)
2. Update `package.json` `name` fields and the root workspace `name`
3. Replace example Zod schemas and routes with your actual API surface
4. Update `src/env.ts` in each package for your environment variables
5. Update `.env.example` files
6. Update this `README.md` and `CLAUDE.md`
7. Register the repo in `polygon-infrastructure` for OIDC if it will deploy via Docker release pipeline
