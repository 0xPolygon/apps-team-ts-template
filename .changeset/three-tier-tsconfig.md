---
---

Adopt the Nx three-tier `tsconfig` pattern: `tsconfig.base.json` at the repo root
owns shared `compilerOptions`; each package has a hub `tsconfig.json` plus
`tsconfig.lib.json` (source / typecheck) and `tsconfig.spec.json` (tests +
non-source files). `tsconfig.build.json` is replaced by `tsconfig.lib.json`
across all packages. Per-package `typecheck` scripts now run `tsc -b`, which
walks each package hub through to its lib and spec configs.

No consumer-visible behaviour change. Pure tooling refactor — no package
versions bumped.
