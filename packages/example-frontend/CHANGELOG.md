# example-frontend

## 0.0.2

### Patch Changes

- fc29e47: Fix broken Sentry import in `main.tsx` (file was renamed `instrument.ts` → `sentry.ts` but the import was not updated). Add `noUncheckedSideEffectImports: true` to both the root `tsconfig.json` (inherited by Node packages) and the frontend `tsconfig.json` so TypeScript catches unresolvable side-effect imports rather than silently deferring them to the bundler.
- a2de5fe: Add `example-schemas` and `example-client` packages to implement the three-package monorepo pattern.

  `example-schemas` publishes Zod response schemas, an OpenAPI registry, and a committed `openapi.json`
  spec. `example-client` consumes the spec via orval to generate a typed fetch client and TanStack
  Query hooks. `example-rest-api` now imports schemas from the shared package and its tests assert
  against the typed client. `example-frontend` uses the client's React hooks to display the current
  block number.

  This establishes the template as the canonical reference for the schemas/service/client pattern
  documented in `apps-team-ops/docs/best-practices/backend.md`.

- Updated dependencies [a2de5fe]
  - @polygonlabs/example-client@0.2.0
