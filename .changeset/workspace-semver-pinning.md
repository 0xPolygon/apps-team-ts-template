---
"example-rest-api": patch
---

Set `link-workspace-packages=false` and `bumpVersionsWithWorkspaceProtocolOnly: false`
to ensure Docker builds at a release tag install workspace library dependencies
(schemas, client) from the npm registry rather than local workspace source.
