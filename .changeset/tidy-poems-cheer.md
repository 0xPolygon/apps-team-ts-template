---
'@polygonlabs/example-rest-api': patch
'@polygonlabs/example-frontend': patch
---

Update dependencies to resolve reported security advisories.

The REST API's auth tests now account for `@polygonlabs/express` 4.1 running request validation before auth handlers — a malformed request to a protected route returns 400 (validation error) instead of 401. See that package's MIGRATION.md.
