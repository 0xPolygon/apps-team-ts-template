---
'example-rest-api': patch
---

Make the example handlers emit 404s the team-standard way — throw `NotFound` from `@polygonlabs/verror` instead of writing `res.status(404).json(...)` by hand.

`getMessage` and `getBlockMetadata` previously hand-rolled the 404 body; the global `createErrorHandler` from `@polygonlabs/express` already maps an `HTTPError`'s `statusCode` and emits the canonical `ErrorResponse` shape, so throwing keeps the served spec, the runtime body, and the typed client in agreement without per-handler status wiring. This matches the auth handler (which already throws `NotAuthenticated`) and the new widget handler. No response-shape change for clients — the body is still `{ error: true, message }`.
