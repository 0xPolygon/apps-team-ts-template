---
'@polygonlabs/example-schemas': major
'@polygonlabs/example-client': patch
'example-rest-api': minor
---

Adopt the chainable `TypedRegistry` API from `@polygonlabs/openapi-registry` v2 and the `HandlerMapFor` pattern from `@polygonlabs/express` v2.

## Breaking changes

`@polygonlabs/example-schemas` now composes its registry by chaining `registerPath`, `registerSecurityScheme`, and `with(fn)` on a single inferred-return `TypedRegistry`, instead of the earlier statement-form `registry.registerPath(...); registry.extend(fn);` pattern. The exported `Operations` type is now derived via `OperationsOf<typeof buildRegistry>` from `@polygonlabs/openapi-registry` rather than a hand-rolled conditional type.

Per-domain route helpers under `src/routes/` are now generic over both `Ops` and `Schemes`, take a `TypedRegistry`, chain registrations, and return the chain's final value.

## Why

The new chainable shape removes the function-wrapper-plus-explicit-annotation requirement that the asserts-based API needed for the operation narrow to flow across the export boundary. Consumers can write `export const buildRegistry = () => new TypedRegistry().registerPath(...).with(...)` directly and the inferred return carries the full manifest. `OperationsOf` brands the empty-manifest case as a type-level error, which surfaces the silent failure where every chain return was discarded.

`example-rest-api` handlers switch from `defineHandlers<Operations, AppAuthMap>()({ ... })` to `({ ... }) satisfies Partial<HandlerMapFor<typeof buildRegistry, AppAuthMap>>`. `HandlerMapFor` reads the registry-builder type directly so handler bags stay in sync with the registry without an intermediate `Operations` import.

See `apps-team-packages/packages/openapi-registry/MIGRATION.md` for the full migration playbook.
