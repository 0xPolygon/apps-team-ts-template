---
"example-rest-api": patch
---

Stop the example Express service from calling `process.exit(0)` in its SIGINT/SIGTERM handler. The force-exit was aborting in-flight Sentry transport sends and async stdout writes — meaning the last error reports and log lines just before shutdown were being silently dropped on rolling deploys. The handler now sets `process.exitCode = 0` and lets the event loop drain naturally, which is the pattern Node's docs recommend.

This matters because every apps-team service copies its graceful-shutdown block from this template. Downstream services (e.g. `staker-pool-allocations`) carry the same bug and will mirror this fix in follow-up PRs.
