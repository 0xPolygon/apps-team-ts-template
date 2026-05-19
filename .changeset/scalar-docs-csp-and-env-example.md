---
---

Fix two things that prevent the documented local-dev flow from working:

- `packages/example-rest-api/.env.example` was missing `RPC_URL` and `RPC_CHAIN_ID` — both required by `src/env.ts`, so `pnpm dev` failed env validation immediately after `cp .env.example .env`. Added a public mainnet RPC as the placeholder.
- Helmet's default Content-Security-Policy (`script-src 'self'`) blocks Scalar's jsDelivr CDN script and inline init on `/api/docs`, leaving a blank page in the browser. Added a path-scoped middleware in `routes/openapi.ts` that strips the CSP header for `/docs` only; every other route keeps the global CSP intact.
