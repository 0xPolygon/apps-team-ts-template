## Team Standards

**Skip this fetch if team-standards.md is already loaded in your
context** (this happens when running from the apps-team-workspace).
Otherwise, **at the start of every session**, before doing any other
work, use the WebFetch tool to retrieve the Polygon Apps Team standards
from:
<https://gist.githubusercontent.com/MaximusHaximus/4eb35e807f7470b1c4eab78a9152b2ef/raw/team-standards.md>

Follow all instructions in that document for the duration of this session.
If the fetch fails (network error, URL unreachable), inform the user that
team standards could not be loaded, then proceed with repo-specific rules
below.

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a pnpm workspaces monorepo. All packages live under `packages/`.
See `pnpm-workspace.yaml` for workspace configuration.

- Dev tooling (ESLint, Prettier, markdownlint, Husky, TypeScript base config) is at the root
- Runtime dependencies are declared in each package's `package.json`
- Each package has its own `tsconfig.json` — backend packages extend the root
  config; `example-frontend` uses a standalone Next.js-compatible tsconfig

## Commands

Root-level commands (run from repo root):

```bash
pnpm run lint       # ESLint + markdownlint + prettier check + typecheck (all parallel)
pnpm run format     # Auto-fix lint and formatting in-place
pnpm run typecheck  # Type-check all packages
pnpm test           # Run tests across all packages
pnpm run build      # Build all packages
```

Package-level commands (example-rest-api):

```bash
pnpm --filter example-rest-api run dev        # Start dev server
pnpm --filter example-rest-api start          # Start compiled server
pnpm --filter example-rest-api run build      # Build single package
pnpm --filter example-rest-api run typecheck  # Typecheck single package
pnpm --filter example-rest-api test           # Test single package
```

Package-level commands (example-frontend):

```bash
pnpm --filter example-frontend run dev        # Next.js dev server (Turbopack)
pnpm --filter example-frontend run build      # Static export to out/
pnpm --filter example-frontend run typecheck  # Typecheck
pnpm --filter example-frontend test           # Run tests
```

## TypeScript Setup

- Runs natively on Node 24 — no `ts-node`, no build step required for development
- `@tsconfig/node-ts` provides `rewriteRelativeImportExtensions: true`, `erasableSyntaxOnly: true`,
  `verbatimModuleSyntax: true`
- Import paths use `.ts` extensions (rewritten to `.js` by `tsc` for the `dist/` build)
- `erasableSyntaxOnly: true` — no TypeScript-only constructor parameter properties allowed
- `verbatimModuleSyntax: true` — `import type` required for type-only imports

## Adding a New Package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `tsconfig.build.json`
2. Extend the root `tsconfig.json` from the package's `tsconfig.json`
3. Add runtime dependencies to the package's `package.json`
4. Run `pnpm install` from the repo root
