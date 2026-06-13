---
'@polygonlabs/example-rest-api': minor
'@polygonlabs/example-frontend': patch
---

Adopt @polygonlabs/express 4.0.0 + @polygonlabs/logger 3.0.0 in the reference service, and scope every workspace package under @polygonlabs/.

## @polygonlabs/example-rest-api

- `@polygonlabs/express` ^3.0.0 → ^4.0.0, `@polygonlabs/logger` ^2.1.0 → ^3.0.0, `@polygonlabs/verror` ^1.0.4 → ^1.1.0. No code changes were required: the v4/v3 majors move RPC fetch-error sanitisation into `@polygonlabs/verror`'s `serializeError` / `VError.toJSON` (adding viem coverage) and rename the internal `sanitiseEthersFetchError` export to `sanitiseRpcFetchError` — none of which this service touches directly.
- Package renamed `example-rest-api` → `@polygonlabs/example-rest-api`. The Docker image name is unchanged (the shared docker-test composite strips the scope), and the changeset git tag is now `@polygonlabs/example-rest-api@x.y.z` — the docker-release trigger's generic tag patterns already match scoped tags, so no workflow change is required.

## @polygonlabs/example-frontend

- Package renamed `example-frontend` → `@polygonlabs/example-frontend` (all-packages-scoped policy; no behaviour change).
