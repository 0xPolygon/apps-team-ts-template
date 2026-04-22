---
"example-rest-api": patch
"example-frontend": patch
---

Bump Vitest from 3.2 to 4.1 in both example packages. Vite itself stays on 7.x (Vitest 4 bundles Vite 7 by default), so the `ssr.resolve.conditions` wrapper in `example-rest-api/vitest.config.ts` is still required — Vite's SSR resolver ignores top-level `resolve.conditions` and tests against workspace library packages would otherwise fail to resolve their `@polygonlabs/source` export with no built `dist/`.
