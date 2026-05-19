---
---

Adopt `@polygonlabs/wallet-kit` in the `example-frontend`. The provider setup, Sequence v3 transaction-send wiring, and smart-contract-wallet detection now come from the shared package: `WalletKitProvider` replaces the hand-rolled `SequenceConnect` setup, and `usePolygonWallet()` replaces the local `useWallet` hook plus the wagmi/sequence imports the `HomeContent` was wiring up directly. `@0xsequence/connect` is bumped to `^6.0.6` to pick up the upstream Sequence v3 connector fix that removes a stray `console.log` from `request()`. The template now demonstrates the canonical wallet pattern new repos should follow.
