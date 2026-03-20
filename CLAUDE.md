## Team Standards

**Skip this fetch if team-standards.md is already loaded in your
context** (this happens when running from the apps-team-workspace).
Otherwise, **at the start of every session**, before doing any other
work, use the WebFetch tool to retrieve the Polygon Apps Team standards
from:
<https://gist.githubusercontent.com/MaximusHaximus/4eb35e807f7470b1c4eab78a9152b2ef/raw/team-standards.md>

Follow all instructions in that document for the duration of this session.
If the fetch fails (network error, URL unreachable), inform the user that
team standards could not be loaded, then proceed with repo-specific rules
below.

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a pnpm workspaces monorepo. All packages live under `packages/`.
See `pnpm-workspace.yaml` for workspace configuration.

- Dev tooling (ESLint, Prettier, markdownlint, Husky, TypeScript base config) is at the root
- Runtime dependencies are declared in each package's `package.json`
- Each package has its own `tsconfig.json` extending the root base config

## Commands

Root-level scripts are in the root `package.json`. Package-level scripts are in each
package's `package.json` under `packages/` and can be run with
`pnpm --filter <package-name> run <script>`.

## TypeScript Setup

- Runs natively on Node 24 — no `ts-node`, no build step required for development
- `@tsconfig/node-ts` provides `rewriteRelativeImportExtensions: true`, `erasableSyntaxOnly: true`,
  `verbatimModuleSyntax: true`
- Import paths use `.ts` extensions (rewritten to `.js` by `tsc` for the `dist/` build)
- `erasableSyntaxOnly: true` — no TypeScript-only constructor parameter properties allowed
- `verbatimModuleSyntax: true` — `import type` required for type-only imports

## Versioning

This repo uses [changesets](https://github.com/changesets/changesets) for versioning and
changelog management.

Every PR that changes code must include a changeset:

```bash
pnpm exec changeset add          # select packages and bump type
pnpm exec changeset add --empty  # chore/internal changes with no version bump
```

The release workflow is in `.github/workflows/release.yml`.

## Workspace Dependency Convention

`link-workspace-packages=false` is set in `.npmrc`. This means pnpm does **not**
auto-link workspace packages for semver ranges — only explicit `workspace:*` deps
use the local workspace.

**Why:** `pnpm deploy` at a release tag must bundle the npm-published version of
library packages (schemas, client), not local workspace source that may have
unreleased commits. With `link-workspace-packages=false`, semver ranges in
`package.json` resolve to npm at build time, ensuring the Docker image matches
exactly what npm consumers get.

**Convention:**

- Use `workspace:*` when actively co-developing a library package in the same PR
- Use `^x.y.z` (real semver) when you are only changing the service and not the library
- `bumpVersionsWithWorkspaceProtocolOnly: false` in `.changeset/config.json` means
  changesets replaces `workspace:*` with `^x.y.z` in the release PR, so the Docker
  build at the tag automatically uses the npm-published version

## Adding a New Package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `tsconfig.build.json`
2. Add `{ "path": "packages/<name>" }` to `references` in root `tsconfig.json`
3. Add runtime dependencies to the package's `package.json`
4. Run `pnpm install` from the repo root
