---
---

ci: shadow-adopt the `apps-npm-release-v2` workflow for one validation cycle

Flip `npm-release-trigger.yml` to call
`0xPolygon/pipelines/.github/workflows/apps-npm-release-v2.yml@main`,
which ships a pinned, patched `@changesets/cli` that fixes the
`--no-git-tag` private-package bug and removes the post-publish
tag-cleanup workaround in `run.sh`. This repo is the validation gate
before the cutover PR in `pipelines` collapses v2 back onto
`apps-npm-release.yml`; after cutover, this file reverts to
`apps-npm-release.yml@main` with no behaviour change.
