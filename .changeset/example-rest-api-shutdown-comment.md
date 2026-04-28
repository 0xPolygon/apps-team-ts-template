---
'example-rest-api': patch
---

Document the graceful-shutdown pattern: `server.close()` stops accepting new connections and waits for in-flight requests to drain; `process.exit(0)` inside the close callback ensures the process actually terminates even if non-server handles (timers, open sockets) are still keeping the event loop alive.
