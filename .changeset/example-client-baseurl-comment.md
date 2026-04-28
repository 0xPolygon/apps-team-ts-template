---
'@polygonlabs/example-client': patch
---

Document why `setBaseUrl` strips trailing slashes — the generated paths always start with `/`, so removing any trailing slash from the base avoids double-slashed URLs at concat time regardless of how the caller writes the base URL.
