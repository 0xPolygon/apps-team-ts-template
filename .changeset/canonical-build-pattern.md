---
---

Adopt the team-wide canonical `tsconfig.build.json` + split
`build`/`build:clean` pattern in the two workspace library packages
(`example-schemas`, `example-client`). Mirrors the structural fix
landed in `apps-team-packages` so the reference template is in sync
with the published packages it references.

Specifically:

- `tsconfig.build.json` adds `customConditions: []` to override the
  inherited `@polygonlabs/source` resolution. Build-time emit must
  reference workspace deps via their published `dist/.d.ts` (Node
  default resolution), not their `src/`. Currently zero diff in
  emitted output; defends against future drift.
- `package.json` splits `build` (fast incremental for dev) from
  `build:clean` (publish-safe path that removes `dist/` and
  `*.tsbuildinfo` before invoking tsc). Eliminates the recurring
  "incremental tsc skipped a file" bug class — `composite: true` +
  `tsc -p` compares src mtimes against `*.tsbuildinfo`, never against
  `dist/`, so external mutations to `dist/` (interrupted publishes,
  manual rm, branch operations) leave the next `tsc -p` exiting 0
  with `dist/` still incomplete.

Internal tooling change only. Zero diff in emitted output.
