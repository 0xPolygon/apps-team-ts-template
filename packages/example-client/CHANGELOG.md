# @polygonlabs/example-client

## 0.2.2

### Patch Changes

- 06b7d1d: Document why `setBaseUrl` strips trailing slashes — the generated paths always start with `/`, so removing any trailing slash from the base avoids double-slashed URLs at concat time regardless of how the caller writes the base URL.

## 0.2.1

### Patch Changes

- 297dc24: Exercise every package bump through the migrated pipelines-backed workflows (CI, npm release, Docker release). No runtime or API change.

## 0.2.0

### Minor Changes

- a2de5fe: Add `example-schemas` and `example-client` packages to implement the three-package monorepo pattern.

  `example-schemas` publishes Zod response schemas, an OpenAPI registry, and a committed `openapi.json`
  spec. `example-client` consumes the spec via orval to generate a typed fetch client and TanStack
  Query hooks. `example-rest-api` now imports schemas from the shared package and its tests assert
  against the typed client. `example-frontend` uses the client's React hooks to display the current
  block number.

  This establishes the template as the canonical reference for the schemas/service/client pattern
  documented in `apps-team-ops/docs/best-practices/backend.md`.
