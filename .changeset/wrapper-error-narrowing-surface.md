---
'@polygonlabs/example-client': minor
---

Re-export the per-client wrapper-error narrowing surface from the package
entry: `TransportError`, `UnknownError`, `isTransportError`,
`isUnknownError`, `isWrapperError`. Consumers can now narrow a typed-client
result's `error` without reaching into `./generated/*.gen.js`.

These are the codegen-emitted, per-client guards from
`@polygonlabs/zod-to-openapi-heyapi` v1.3 (every wrapper return is
statically widened to `${Op}Error | TransportError | UnknownError`).
Cross-client / logging-adapter helpers still live at
`@polygonlabs/zod-to-openapi-heyapi/errors` (`categorizeApiError`,
`getApiErrorMessage`, structural classes/types) — use the per-client
guards in component code where the wrapper return type is in scope, and
the cross-client helper in adapters that route on category without
caring which operation produced the error.

```ts
import { isTransportError, isUnknownError } from '@polygonlabs/example-client';

if (isTransportError(error)) { /* error.cause is Error — no cast */ }
if (isUnknownError(error))   { /* error.body is unknown, cause.issues is ZodIssue[] */ }
```

Also regenerates `src/generated/**` against plugin v1.3 — picks up the
`WrapErrors<TData, TError, ThrowOnError>` widening on every wrapper
return type, the `instanceof Error` discrimination in the runtime
guards, and the `Symbol.for(...)` identity markers on the error
classes (cross-realm-safe `instanceof` substitute).
