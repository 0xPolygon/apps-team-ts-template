---
---

Fix `docker-release-trigger.yml` tag glob to match scoped npm package names.

`*@[0-9]*` uses a single `*` which does not cross `/` in GitHub Actions glob patterns, so tags like `@polygonlabs/example-rest-api@1.2.3` never triggered the workflow. Changed to `**@[0-9]*` which matches across path separators.
