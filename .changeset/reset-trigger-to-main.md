---
---

ci: reset npm-release trigger from the v2 shadow back to `apps-npm-release.yml@main`

The v2 shadow validation cycles are complete and pipelines#35 collapses the simplified release flow onto `apps-npm-release.yml`. This restores the canonical trigger ref.
