# example-rest-api

## 0.1.0

### Minor Changes

- ddc8dbd: Add full release pipeline infrastructure: changesets versioning, OIDC npm publishing via trusted publisher, and Docker release workflow using a generic two-stage pnpm deploy Dockerfile.

### Patch Changes

- 1362a32: Support `TEST_BASE_URL` environment variable in integration tests so the
  same suite can run against both the local Express app and a deployed Docker
  container.
- 1362a32: Set `link-workspace-packages=false` and `bumpVersionsWithWorkspaceProtocolOnly: false`
  to ensure Docker builds at a release tag install workspace library dependencies
  (schemas, client) from the npm registry rather than local workspace source.
