---
'@polygonlabs/example-client': patch
---

Route the hand-written barrel (`src/index.ts`, `src/react.ts`) entirely
through `./generated/index.js` — no more deep `*.gen.ts` reaches. With
`@polygonlabs/zod-to-openapi-heyapi@1.3.0`'s completed auto-barrel
(`includeInEntry: true` on `@hey-api/client-fetch` and the upstream
`@tanstack/react-query` plugin, with the colliding `QueryKey` alias
filtered out), the singleton `client`, every SDK wrapper, the
wrapper-error classes + guards, and every TanStack Query factory
(codec-aware and standard) all flow through the auto-generated
canonical entry. Consumers wiring up a publishable client package
should treat `./generated/index.js` as the single import target —
the layout under `./generated/` (which file owns which op, where the
singleton lives) is an internal codegen concern they shouldn't have
to know about.
