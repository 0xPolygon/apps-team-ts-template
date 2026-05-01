/**
 * Registry composition for the Example REST API. Wraps
 * `@polygonlabs/openapi-registry`'s `TypedRegistry` — every `registerPath`
 * call narrows the registry's `Ops` accumulator via `asserts this is X`,
 * and that narrow flows out through `buildRegistry`'s inferred return
 * type into the `Operations` alias the service consumes.
 *
 * Compose inside `buildRegistry()` — wrapping in a function is what
 * preserves the accumulated narrow across the export boundary. The
 * function's return type is inferred from the final value of `registry`,
 * after every domain helper has run its `extend(...)`.
 *
 * To add a new route: append a `registry.registerPath({...})` call inside
 * the relevant per-domain helper under `./routes/`, or add a new domain
 * helper and `registry.extend(addNewDomainRoutes)` here. Nothing else
 * needs updating — the OpenAPI spec, the codegen'd client, the server's
 * request/response validation, and the typed handler binding all derive
 * from the registry's accumulated type.
 */

import { TypedRegistry } from '@polygonlabs/openapi-registry';

import { addBlockRoutes } from './routes/blocks.ts';
import { addCoreRoutes } from './routes/core.ts';
import { addMessageRoutes } from './routes/messages.ts';

export function buildRegistry() {
  // Explicit `: TypedRegistry` annotation is load-bearing: TS2775 requires
  // it for the `asserts this is X` narrowing on registerPath /
  // registerSecurityScheme to fire. An inferred type from
  // `new TypedRegistry()` does not qualify.
  const registry: TypedRegistry = new TypedRegistry();

  // Single security scheme demonstrating auth flow end-to-end. Operations
  // opt in by declaring `security: [{ ApiKeyAuth: [] }]`; the registry-driven
  // router then requires an `ApiKeyAuth` handler at compile time and runs
  // it before request validation.
  registry.registerSecurityScheme('ApiKeyAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'x-api-key',
    description: 'Shared secret. Required on operations declaring ApiKeyAuth.'
  });

  registry.extend(addCoreRoutes);
  registry.extend(addBlockRoutes);
  registry.extend(addMessageRoutes);

  return registry;
}

/**
 * The accumulated operations type from `buildRegistry`. Consumers (the
 * registry-driven Express router) read this for `HandlerMap<Operations>`.
 */
export type Operations =
  ReturnType<typeof buildRegistry> extends TypedRegistry<infer O, Record<string, true>> ? O : never;
