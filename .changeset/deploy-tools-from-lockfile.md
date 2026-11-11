---
'@polygonlabs/example-frontend': patch
---

Run the Cloudflare deploy with a lockfile-resolved `wrangler` instead of fetching it at deploy time.

- `wrangler` is now a devDependency and the reference deploy workflow runs it with `pnpm exec`
- the build runs in its own step, so the Cloudflare credentials are only present for the deploy
- `wrangler.toml` no longer has a `[build]` hook
- third-party actions in the reference workflows are pinned to commit SHAs
