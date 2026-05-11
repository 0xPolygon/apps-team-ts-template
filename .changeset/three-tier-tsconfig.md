---
'@polygonlabs/example-schemas': patch
'@polygonlabs/example-client': patch
'example-rest-api': patch
'example-frontend': patch
---

Adopt the Nx three-tier `tsconfig` pattern: `tsconfig.base.json` at the repo root
owns shared `compilerOptions`; each package has a hub `tsconfig.json` plus
`tsconfig.lib.json` (source / typecheck) and `tsconfig.spec.json` (tests +
non-source files). `tsconfig.build.json` is replaced by `tsconfig.lib.json`
across all packages. Per-package `typecheck` scripts now run `tsc -b`, which
walks each package hub through to its lib and spec configs.

Eliminates the TS6305 surface that the previous flat shape produced when
running `tsc --noEmit` at the repo root against composite references, and
makes future updates to project-wide compiler options a one-knob change in
`tsconfig.base.json` rather than an edit-per-package chore.

No runtime behaviour change.
