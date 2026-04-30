---
'example-rest-api': patch
---

Adopt `@polygonlabs/express` for request-scoped logging, the global error
handler, and the 404 handler. Bump `@polygonlabs/logger` to v2 and
`@polygonlabs/verror` to v1.0.3 alongside.

The previous `src/errors.ts` (ethers fetch-error sanitiser + Express error
middleware) and the `req.log` augmentation in `src/server.ts` are deleted —
both are now provided by `@polygonlabs/express`. Routes call `getLogger()`
in place of `req.log`. The `setupLogger(logger)` middleware mounts before
any route and primes the out-of-request fallback for `getLogger()` in one
call. The `declare module 'express-serve-static-core'` augmentation and the
`@types/express-serve-static-core` devDep are gone.

The error-sanitisation integration test was tightened to assert what the
template actually guarantees end-to-end (URL-stripped response message, no
token in the body) rather than the exact ethers `shortMessage` text — the
shape of the error message is implementation-detail of the package that now
owns the sanitisation, not of the template.
