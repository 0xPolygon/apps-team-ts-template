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
- TypeScript uses the Nx three-tier `tsconfig` pattern: `tsconfig.base.json` at the
  repo root owns all shared `compilerOptions`; each package has a hub `tsconfig.json`
  (no `compilerOptions`, only `references`) plus per-purpose `tsconfig.lib.json` (source
  build / typecheck) and `tsconfig.spec.json` (tests + non-source files like
  `vitest.config.ts`). The root `tsconfig.json` is itself a solution-style hub that
  references each package hub. See "Adding a New Package" below.

There are three package roles:

| Package | Example | Published | Role |
|---------|---------|-----------|------|
| schemas | `example-schemas` | no | Zod schemas, OpenAPI registry, committed `openapi.json` |
| client  | `example-client`  | no | hey-api-generated fetch SDK + TanStack Query options factories |
| service | `example-rest-api` | no | Express app, Dockerfile, deployment |

The frontend (`example-frontend`) consumes the client package like any external consumer would.

## Commands

Root-level scripts are in the root `package.json`. Package-level scripts are in each
package's `package.json` under `packages/` and can be run with
`pnpm --filter <package-name> run <script>`.

## TypeScript Setup

- Node 24 runs TypeScript natively — no `ts-node`, no transpiler needed
- `@tsconfig/node-ts` provides `rewriteRelativeImportExtensions: true`, `erasableSyntaxOnly: true`,
  `verbatimModuleSyntax: true`
- Import paths use `.ts` extensions (rewritten to `.js` by `tsc` for the `dist/` build)
- `erasableSyntaxOnly: true` — no TypeScript-only constructor parameter properties allowed
- `verbatimModuleSyntax: true` — `import type` required for type-only imports

## Build-free Local Development

Workspace library packages (`example-schemas`, `example-client`) export source TypeScript
via a `source` export condition alongside the compiled `dist/` targets:

```json
"exports": {
  ".": {
    "@polygonlabs/source": "./src/index.ts",
    "types":  "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

This enables fully build-free local development:

- **Typecheck** (`pnpm run typecheck`) — resolves `.ts` source via `customConditions: ["@polygonlabs/source"]`
  in `tsconfig.base.json`. No `dist/` needed.
- **Service dev** (`pnpm --filter example-rest-api run dev`) — passes `--conditions @polygonlabs/source` to
  Node. Workspace symlinks point outside `node_modules/` so Node's type stripping applies.
  Changes to library source are visible to the running service immediately — no watchers or
  rebuilds.
- **Frontend dev** (`pnpm --filter example-frontend run dev`) — Vite is configured with
  `resolve.conditions: ["@polygonlabs/source"]`, picks up `.ts` source directly.
- **Tests** — Vitest is configured with `ssr.resolve.conditions: ["@polygonlabs/source"]` (service) and
  `resolve.conditions: ["@polygonlabs/source"]` (frontend).

**Docker** requires a build because `pnpm deploy` creates real `node_modules/` copies (no
symlinks), where Node 24 refuses to strip types. The builder stage runs `pnpm run build`
before `pnpm deploy`. `pnpm run build` is a recursive `--if-present` call; pnpm runs packages
in topological order so `example-schemas` compiles before `example-client` automatically.

## Versioning

This repo uses [changesets](https://github.com/changesets/changesets) for versioning and
changelog management.

Every PR that changes code must include a changeset:

```bash
pnpm exec changeset add          # select packages and bump type
pnpm exec changeset add --empty  # chore/internal changes with no version bump
```

The release workflow trigger is in `.github/workflows/npm-release-trigger.yml`.

## Workspace Dependency Convention

`link-workspace-packages=false` is set in `.npmrc`. This means pnpm does **not**
auto-link workspace packages for semver ranges — only explicit `workspace:*` deps
use the local workspace.

**Why:** `pnpm deploy` at a release tag must bundle the npm-published version of
library packages (schemas, client), not local workspace source that may have
unreleased commits. With `link-workspace-packages=false`, semver ranges in
`package.json` resolve to npm at build time, ensuring the Docker image matches
exactly what npm consumers get.

**Convention:**

- Use `workspace:*` when actively co-developing a library package in the same PR
- Use `^x.y.z` (real semver) when you are only changing the service and not the library
- `bumpVersionsWithWorkspaceProtocolOnly: false` in `.changeset/config.json` means
  changesets replaces `workspace:*` with `^x.y.z` in the release PR, so the Docker
  build at the tag automatically uses the npm-published version

## Service Composition

The runtime stack is registry-driven — `@polygonlabs/openapi-registry` owns the
manifest, `@polygonlabs/express` consumes it for the router, and
`@polygonlabs/zod-to-openapi-heyapi` consumes it for the client. The same
schemas are used at every layer.

- **Schemas package** (`packages/example-schemas/`): a `TypedRegistry` from
  `@polygonlabs/openapi-registry` accumulates every `registerPath` and
  `registerSecurityScheme` call into the registry's *type* (not just
  `definitions`) via chained method returns. `buildRegistry` is a single
  chained expression (`new TypedRegistry().registerSecurityScheme(...).with(addCoreRoutes)...`);
  no `: TypedRegistry` annotation, no function-wrapper-as-narrow-bridge —
  the chain's inferred return type carries the manifest directly. The one
  silent failure mode (a discarded chain return drops the type-level
  narrow even though the runtime registration still happens) is caught
  by two layers: `OperationsOf<typeof buildRegistry>`'s empty-manifest
  brand surfaces the worst case as a type error, and the
  `polygon/no-discarded-typed-registry-chain` lint rule from
  `@polygonlabs/apps-team-lint`'s `typescript()` preset catches partial
  discards at lint time.
- **Service package** (`packages/example-rest-api/src/server.ts`):
  `createRegistryRouter({ registry })` from `@polygonlabs/express/registry`
  derives every mounted route from the same registry that produces the served
  spec — the spec and the routes can't drift. `.auth(...)` binds auth handlers
  by security-scheme name (compile-time exhaustive); `.implement(...)` binds
  operation handlers by `operationId` (compile-time exhaustive). Per-domain
  handler bags type themselves via
  `({ ... }) satisfies Partial<HandlerMapFor<typeof buildRegistry, AppAuthMap>>`;
  `HandlerMapFor` reads the registry-builder type directly (no separate
  `Operations` import needed) and `Partial<…>` lets each domain bag cover
  a subset of operations — the wiring file's `.implement(...)` chain
  composes them and `.toExpress()`'s exhaustiveness gate catches anything
  unbound.
- **Logger and error handling**: `setupLogger(logger)` from
  `@polygonlabs/express` mounts the per-request child logger and primes
  `getLogger()` (which handler code uses instead of threading `req.log`).
  `createErrorHandler()` answers `HTTPError`s with their `statusCode` and the
  canonical `{ error: true, message, info? }` shape — `info` carries the
  `z.treeifyError` tree from request-validation failures, and HTTPErrors
  with structured info surface it to the response body.
- **Canonical error response schema**: import `ErrorResponseSchema` from
  `@polygonlabs/openapi-registry/error-schemas` (re-exported from
  `@polygonlabs/example-schemas` as `ErrorResponse` — see naming note in
  *API Client Codegen* below). Reference it from `responses[code].content`
  slots so the served spec, the runtime body, and the typed client agree.
  The subpath has zero Express-runtime imports, so a schemas-only consumer
  doesn't transitively depend on Express + pino + Sentry.

## API Client Codegen

`example-client` is generated by `@hey-api/openapi-ts` using
`@polygonlabs/zod-to-openapi-heyapi` as the registry-driven plugin. The plugin
emits `import { <Name> } from '@polygonlabs/example-schemas'` for every
registered schema and a `parseAsync` response transformer per operation, so
the schemas the backend validates against are the same Zod values the client
imports — codecs (`Int64Codec`, `IsoDateCodec`, …) round-trip end-to-end.

### Registered name vs. exported binding name

The plugin's codegen-time audit fails the build if a registered schema's
exported binding doesn't match its OpenAPI registered name. For schemas
declared inline in `schemas.ts` this is automatic — the binding name *is*
the registered name. For canonical schemas re-exported from another package
(e.g. `ErrorResponseSchema` from `@polygonlabs/openapi-registry/error-schemas`,
registered with `.openapi('ErrorResponse', …)`), rename on the way through:

```ts
// packages/example-schemas/src/index.ts
export { ErrorResponseSchema as ErrorResponse } from '@polygonlabs/openapi-registry/error-schemas';
```

The plugin emits `import { ErrorResponse } from '@polygonlabs/example-schemas'`
and the generated client compiles. The audit error message names the
expected binding when the alias is missing.

Local iteration when only `example-schemas` changed:

```bash
pnpm --filter @polygonlabs/example-schemas run build
pnpm --filter @polygonlabs/example-client run generate
```

### The `@polygonlabs/source` codegen wrinkle

This monorepo ships a build-free dev story via the `@polygonlabs/source`
custom export condition — workspace tsconfigs, vitest configs, and the
service `dev` script all read `.ts` source directly without producing a
`dist/`. The hey-api codegen step has a different resolution profile:

- The plugin's audit runs `await import('@polygonlabs/example-schemas')`
  from inside `node_modules/@polygonlabs/zod-to-openapi-heyapi/dist/` —
  Node's default resolution. The `@polygonlabs/source` condition is
  **not** active for that dynamic import unless the openapi-ts process
  was started with `--conditions=@polygonlabs/source` (or
  `NODE_OPTIONS='--conditions=@polygonlabs/source'`).
- So in practice, `pnpm --filter @polygonlabs/example-client run generate`
  needs a built `dist/` for the schemas package — Node falls through to
  the package's `import` export condition, which resolves to
  `./dist/index.js`. This is the case CI handles automatically (root
  `pnpm -r --if-present run build` runs in topological order, schemas
  before client).

For local iteration, the build step shown above before the generate
covers it. If you want the codegen to read source directly without a
schemas rebuild, run:

```bash
NODE_OPTIONS='--conditions=@polygonlabs/source' \
  pnpm --filter @polygonlabs/example-client run generate
```

This isn't a plugin-side concern — the plugin's error message hints at
the workaround when the dynamic import fails — but it's specific enough
to this repo's build-free story that it's worth documenting here.

`packages/example-client/src/generated/` is committed and gated by the
package's `codegen-drift-check` script — drift surfaces in PR diffs.

The repo's `sonar-project.properties` excludes `**/src/generated/**`
from analysis and coverage so the snapshot doesn't dominate Sonar
issue counts.

See `packages/zod-to-openapi-heyapi/README.md` in `apps-team-packages`
for the plugin's full design, option semantics, and migration notes.

## Adding a New Package

Each package follows the three-tier `tsconfig` pattern:

1. Create `packages/<name>/` with `package.json` and three TypeScript configs:
   - `tsconfig.json` — hub. `extends: "../../tsconfig.base.json"`, `files: []`,
     `include: []`, and `references` pointing at the package's own
     `tsconfig.lib.json` and `tsconfig.spec.json`.
   - `tsconfig.lib.json` — source build / typecheck. Sets `rootDir: src`,
     `outDir: dist`, `emitDeclarationOnly: false`, owns `include: ["src/**/*.ts"]`.
     For published library packages, override `customConditions: []` so build-time
     resolution of workspace deps goes through their published `dist/` rather than
     the `@polygonlabs/source` condition. Declare cross-package dependencies with
     `references` pointing at the depended-upon package's `tsconfig.lib.json`
     (not its hub). The Vite-style frontend resolves workspace deps via the
     `@polygonlabs/source` condition without a project reference, so its lib has
     no cross-package `references`.
   - `tsconfig.spec.json` — tests and non-source files (`vitest.config.ts`,
     `vitest.setup.ts`, top-level config files, etc.). Adds vitest types,
     references `./tsconfig.lib.json`. Spec files commonly use `.ts`-extension
     imports relative to other projects, so set `allowImportingTsExtensions: true`
     and `rewriteRelativeImportExtensions: false` to silence the cross-project
     rewrite check.

2. Add a reference in the root `tsconfig.json` hub:
   `{ "path": "packages/<name>" }` — root references the package hub, never the
   package's lib or spec directly.

3. Add `package.json` scripts that use `tsc -b`:
   - `"typecheck": "tsc -b"` — walks the hub graph, emits to gitignored
     `dist/` and `out-tsc/` directories (no `--noEmit` because
     `tsc --build --noEmit` is incompatible with composite project references).
   - For library packages: `"build": "pnpm run typecheck && tsc -b tsconfig.lib.json && ..."` —
     target the lib config explicitly so the build emits the library payload only,
     not the spec output.

4. Add an `eslint.config.js` per the team template, plus a top-level
   `{ ignores: ['out-tsc/**'] }` block — `tsc -b` emits `.d.ts` artifacts to
   `out-tsc/` for spec configs, and ESLint's TS project service errors on
   `.d.ts` files outside any tsconfig include.

5. Add runtime dependencies to the package's `package.json` and run
   `pnpm install` from the repo root.
