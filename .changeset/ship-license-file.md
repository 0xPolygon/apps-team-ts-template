---
'@polygonlabs/example-client': patch
'@polygonlabs/example-db': patch
'@polygonlabs/example-e2e': patch
'@polygonlabs/example-frontend': patch
'@polygonlabs/example-indexer': patch
'@polygonlabs/example-rest-api': patch
'@polygonlabs/example-schemas': patch
---

Ship the LICENSE file inside each package directory

The previous release added the Apache-2.0 license at the repo root and
declared it in package.json, but npm only auto-includes a LICENSE file
in the packed tarball when it lives in the same directory as the
package's own package.json. These packages are all private today, but
this keeps the pattern correct for any package that publishes later.
