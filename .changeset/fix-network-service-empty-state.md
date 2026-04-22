---
"example-rest-api": patch
---

Fix `/api/block-number` (and any route consuming a `NetworkService`) returning `500 "has no data and no active poll"` when the service's initial RPC poll failed. `NetworkService.get()` now triggers a fresh on-demand poll in that state instead of throwing, so the caller either receives data or the real underlying fetch error — the template no longer has a several-second failure window after a transient startup hiccup.
