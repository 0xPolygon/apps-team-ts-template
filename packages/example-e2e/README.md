# @polygonlabs/example-e2e

End-to-end proof of the **indexer → db** flow against a live Polygon **bor**
devnet — the chain where viem's filter-based `watchEvent` silently drops tip
logs, and exactly where `@polygonlabs/viem-event-watcher`'s `getLogs` polling
earns its keep.

## What it proves

With no mocks between the chain and the store:

1. Deploy a minimal event-emitter contract to bor (embedded creation bytecode —
   no Foundry, no solc; see `src/event-emitter.ts`).
2. Emit N `Ping(sender, seq)` events (one tx each).
3. Point the **real** indexer (`@polygonlabs/example-indexer`'s
   `initializeServices`) at the deployed contract and run its consumer to the
   chain tip (`consumer.catchUp()`).
4. Assert `@polygonlabs/example-db`'s `EventStore` received **exactly** those N
   decoded events, with the right args, and that the per-chain cursor advanced.

This is the team's four-layer **e2e** tier: it needs the real chain the service
can't faithfully stub, so it's opt-in and never runs on every PR. There is no
`test` script, so `pnpm -r run test` skips this package.

## Devnet

The devnet is the canonical apps-team kurtosis-pos snapshot (the same one
lst-api's e2e uses), restored from a published image by
`scripts/restore-e2e-snapshot.sh`. Deterministic coordinates: bor RPC at
`http://127.0.0.1:9545`, chain id `4927`, deployer = the public kurtosis admin
key. The Firestore emulator (the indexer's persistence) is managed by
`test/global-setup.ts` via `docker-compose.yml`.

## Running

```sh
# Restore the devnet, run the suite, tear the devnet down:
pnpm --filter @polygonlabs/example-e2e run e2e

# Apple-Silicon / local prebuilt snapshot image (skips the GHCR pull):
IMAGE=lst-api-e2e-snapshot:bash32fix USE_LOCAL_IMAGE=1 \
  pnpm --filter @polygonlabs/example-e2e run e2e

# If the devnet is already up, run just the suite:
pnpm --filter @polygonlabs/example-e2e run test:e2e
```

The shared devnet uses fixed host ports (`8545`/`9545`) and a `pos`-named
docker compose project. Before restoring, check `docker ps` for running `pos-*`
containers — another agent may already hold the devnet. Always tear it down
when done.
