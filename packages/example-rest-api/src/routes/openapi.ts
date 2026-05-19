import type { RequestHandler, Router as RouterType } from 'express';

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

// Scalar serves an HTML shell that loads its own JS from jsDelivr and runs
// an inline init script. Helmet's default Content-Security-Policy
// (`script-src 'self'`) blocks both, leaving /docs as a blank page in the
// browser. Strip CSP for /docs only; every other route keeps the global
// CSP intact.
const allowScalarScripts: RequestHandler = (_req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
};

router.use('/docs', allowScalarScripts, apiReference({ content: spec }));

export { router as openApiRouter };
