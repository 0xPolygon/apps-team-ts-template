---
'@polygonlabs/example-frontend': patch
---

Upgrade `@polygonlabs/wallet-kit` to 2.0.x.

The example frontend does not use the screening subsystem that 2.0 reworked, so this is a drop-in version alignment with no behavioral change. Peer dependencies are unchanged between the two majors; the upgrade pulls in `@polygonlabs/api-gateway-client` as a new transitive.
