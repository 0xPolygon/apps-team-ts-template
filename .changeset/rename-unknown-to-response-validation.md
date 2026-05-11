---
'@polygonlabs/example-client': patch
'example-frontend': patch
---

Follow `@polygonlabs/zod-to-openapi-heyapi`'s rename of `UnknownError`
to `ResponseValidationError`. The new name describes the layer the
failure happened in (response-side validation), symmetric with
`TransportError` (transport-layer failure) and unambiguous against
request-side `z.encode` failures the plugin also runs.

- `packages/example-client` re-exports `ResponseValidationError` and
  `isResponseValidationError` (replacing the old names).
- `packages/example-frontend`'s `<ApiErrorMessage>` narrows via
  `isResponseValidationError` and tags the rendered alert with
  `data-error-category="response-validation"`.
- `reportApiError` (Sentry adapter) tags events with
  `api.error.kind: response-validation` and attaches the wire body +
  full `ZodError` under `api.response-validation`. The structural
  `ResponseValidationError.cause` type from the plugin's `/errors`
  subpath is now the full `ZodError`, so `.format()` / `.flatten()` /
  `.issues` are reachable without a cast.
