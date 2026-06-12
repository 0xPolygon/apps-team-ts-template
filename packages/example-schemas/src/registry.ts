/**
 * Registry composition for the Example REST API.
 *
 * `TypedRegistry` accumulates registered operations and security schemes
 * into its type via chained method returns — `registerPath`,
 * `registerSecurityScheme`, and `with(fn)` each return a `TypedRegistry`
 * narrowed with what was just registered. The chain's final value is what
 * `buildRegistry` returns; downstream consumers read the accumulated
 * manifest via `OperationsOf<typeof buildRegistry>`.
 *
 * To add a new route: append a `.registerPath({...})` call inside the
 * relevant per-domain helper under `./routes/`, or add a new domain
 * helper and `.with(addNewDomainRoutes)` here. Nothing else needs
 * updating — the OpenAPI spec, the codegen'd client, the server's
 * request/response validation, and the typed handler binding all derive
 * from the registry's accumulated type.
 */

import { TypedRegistry } from '@polygonlabs/openapi-registry';

import { addBlockRoutes } from './routes/blocks.ts';
import { addCoreRoutes } from './routes/core.ts';
import { addMessageRoutes } from './routes/messages.ts';
import { addWidgetRoutes } from './routes/widgets.ts';

export const buildRegistry = () =>
  new TypedRegistry()
    // Single security scheme demonstrating auth flow end-to-end. Operations
    // opt in by declaring `security: [{ ApiKeyAuth: [] }]`; the registry-driven
    // router then requires an `ApiKeyAuth` handler at compile time and runs
    // it before request validation.
    .registerSecurityScheme('ApiKeyAuth', {
      type: 'apiKey',
      in: 'header',
      name: 'x-api-key',
      description: 'Shared secret. Required on operations declaring ApiKeyAuth.'
    })
    .with(addCoreRoutes)
    .with(addBlockRoutes)
    .with(addMessageRoutes)
    .with(addWidgetRoutes);
