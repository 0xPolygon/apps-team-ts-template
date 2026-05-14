import type { Router as RouterType } from 'express';

import { apiReference } from '@scalar/express-api-reference';
import { Router } from 'express';

// The committed openapi.json in example-schemas is the canonical spec artifact —
// the same file orval uses to generate the client. Serving it directly keeps
// the runtime spec identical to what consumers depend on.
import spec from '@polygonlabs/example-schemas/openapi.json' with { type: 'json' };

const router: RouterType = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(spec);
});

router.use('/docs', apiReference({ content: spec }));

export { router as openApiRouter };
