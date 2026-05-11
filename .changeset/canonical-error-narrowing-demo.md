---
'example-frontend': patch
---

Demonstrate the canonical wrapper-error narrowing pattern end-to-end:

- A new `<ApiErrorMessage>` component (`src/components/api-error-message.tsx`)
  consumes per-client guards re-exported from `@polygonlabs/example-client`
  (`isTransportError`, `isUnknownError`) and TS flow-narrows the rest.
  No `as` casts, no schema imports at the UI layer — just the wrapper
  return type. Stable `data-error-category` attribute on the rendered
  alert routes Playwright assertions and Sentry telemetry without
  scraping copy.
- A new `reportApiError` Sentry adapter (`src/lib/report-api-error.ts`)
  uses the cross-client `categorizeApiError` helper from
  `@polygonlabs/zod-to-openapi-heyapi/errors` (not the per-client guards)
  — that's the canonical split: per-client guards in component code
  where the wrapper return type is in scope; the cross-client helper
  in adapters that route on category without caring which operation
  produced the error. Tags every Sentry event with
  `api.error.kind: transport | unknown | native-error | other` so
  dashboards can filter without parsing messages, and attaches the
  wire body + Zod issues as a Sentry context for the `unknown`
  (schema-drift) category.
- Wired into the global `QueryCache.onError` /
  `MutationCache.onError` in `src/app.tsx`; the `codec-test` panel
  passes `meta.operation` per call site so every Sentry event
  carries a stable per-operation tag without per-component plumbing.

Unit coverage: 6 tests pin the `<ApiErrorMessage>` narrowing pattern
(structurally-real fixtures, no schema imports), 4 tests pin the
`reportApiError` category → tag mapping.
