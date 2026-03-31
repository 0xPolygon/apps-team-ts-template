---
"example-frontend": patch
---

Fix broken Sentry import in `main.tsx` (file was renamed `instrument.ts` → `sentry.ts` but the import was not updated). Add `noUncheckedSideEffectImports: true` to both the root `tsconfig.json` (inherited by Node packages) and the frontend `tsconfig.json` so TypeScript catches unresolvable side-effect imports rather than silently deferring them to the bundler.
