# @polygonlabs/example-schemas

Zod response schemas, the OpenAPI registry, and the committed OpenAPI spec for the template's example REST
API. It is the template's example of a published library: the REST API validates its responses against these
schemas, and the generated client imports the same Zod values, so client and server agree on every shape.

```ts
import { BlockNumberResponse } from '@polygonlabs/example-schemas';
import { buildRegistry } from '@polygonlabs/example-schemas/registry';
import spec from '@polygonlabs/example-schemas/openapi.json' with { type: 'json' };
```

This package exists to demonstrate the pattern. Copies of the template rename it to `<service>-schemas`.
