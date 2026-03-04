# apps-team-ts-template

Monorepo template for Polygon Apps Team TypeScript services. Uses pnpm workspaces
with shared dev tooling at the root and per-package runtime dependencies.

## What's Included

- **pnpm workspaces** — Monorepo with `packages/` directory
- **TypeScript** — Native Node 24 execution, `@tsconfig/node24` + `@tsconfig/node-ts`
- **ESLint** — Flat config with `typescript-eslint`, `import-x`, `perfectionist`, `prettier`
- **Prettier** — Code formatting (markdown excluded — handled by markdownlint)
- **markdownlint-cli2** — Markdown linting and formatting
- **Mocha + Chai** — Test runner and assertion library
- **Husky** — Git hooks for conventional commits, formatting, and type-checking
- **Environment validation** — `@t3-oss/env-core` + Zod schema per package
- **CI workflow** — GitHub Actions for lint and test

## Getting Started

```bash
# Install all dependencies (root + packages)
pnpm install

# Copy environment file for the example package
cp packages/example-rest-api/.env.example packages/example-rest-api/.env

# Run the example package in development mode
pnpm --filter example-rest-api run dev
```

## Scripts

### Root (whole-repo)

| Script | Description |
| ------ | ----------- |
| `pnpm run lint` | ESLint + markdownlint + prettier + typecheck (parallel) |
| `pnpm run format` | Auto-fix lint and formatting in-place |
| `pnpm run typecheck` | Type-check all packages |
| `pnpm test` | Run tests across all packages |
| `pnpm run build` | Build all packages |

### Per-package

| Script | Description |
| ------ | ----------- |
| `pnpm --filter <name> run dev` | Start dev server |
| `pnpm --filter <name> start` | Start compiled server from `dist/` |
| `pnpm --filter <name> run build` | Compile TypeScript to `dist/` |
| `pnpm --filter <name> run typecheck` | Type-check single package |
| `pnpm --filter <name> test` | Run tests for single package |

## Packages

- **`packages/example-rest-api`** — Stubbed Express server with OpenAPI docs (Scalar + zod-to-openapi)

## After Cloning This Template

1. Rename the root `name` in `package.json`
2. Rename or replace `packages/example-rest-api/` with your actual service
3. Update environment schemas in each package's `src/env.ts`
4. Update `.env.example` files to match
5. Update this `README.md` and `CLAUDE.md` for your project

## Adding a New Package

1. Create `packages/<name>/` with its own `package.json`, `tsconfig.json`, `tsconfig.build.json`
2. Extend the root `tsconfig.json` from the package's `tsconfig.json`
3. Add a `.mocharc.json` in the package for test configuration
4. Run `pnpm install` from the repo root
