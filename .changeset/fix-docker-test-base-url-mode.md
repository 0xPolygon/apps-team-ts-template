---
'@polygonlabs/example-rest-api': patch
---

Fix the test suite so it passes against a deployed container (`TEST_BASE_URL` mode), unbreaking the Docker release test gate.

- Auth-gated requests now authenticate with the `MANAGEMENT_API_KEY` the server under test was actually started with: the tests read the key from the environment instead of hardcoding the committed `.env.test` placeholder, and the vitest global setup preserves an externally injected value over that placeholder.
- Chain-coupled assertions no longer assume the in-process stub fetchers: against a live RPC the block-number check asserts the codec decode rather than an exact height, the codec round-trip uses a well-finalised mainnet block, and the not-found case asks for a far-future height instead of block 0 (which exists on a real chain).
