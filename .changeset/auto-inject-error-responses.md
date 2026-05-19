---
---

Adopt the auto-inject error-response behaviour landing in
`@polygonlabs/openapi-registry`. The template no longer hand-rolls
`ValidationError` and `NotFound` Zod schemas — the registry's
`TypedRegistry.registerPath` now infers and merges the canonical
`ValidationErrorResponse` (for 400 when request validation is declared),
`ErrorResponse` (for 401 when security is declared, and 500 always)
into every route's `responses`. Hand-rolled error schemas are deleted
from `packages/example-schemas/src/schemas.ts`; routes drop their
duplicate 400/401 declarations and reference the canonical
`ErrorResponse` for 404 (handler-emitted, declared explicitly).

The generated client picks up the union of validation and generic
error responses automatically. No consumer-visible runtime behaviour
change for the example service — pure spec cleanup. The example
schemas package's barrel now re-exports `ValidationErrorResponse`
alongside `ErrorResponse` so the codegen plugin's audit can resolve
the registered schema names to their bindings.

Bumps `@polygonlabs/express` peer to the new major (3.0.0) and picks
up the matching `@polygonlabs/openapi-registry` minor (2.1.0). See
the upstream changelogs for the validator and error-handler fixes
that ship in this wave.
