# example-frontend

## 1.0.1

### Patch Changes

- 297dc24: Exercise every package bump through the migrated pipelines-backed workflows (CI, npm release, Docker release). No runtime or API change.
- Updated dependencies [297dc24]
  - @polygonlabs/example-client@0.2.1

## 1.0.0

### Major Changes

- 95246ef: Add Sequence v3 wallet handling patterns and send-native transaction example.

  `useWallet` hook handles Sequence v3 provider configuration on connect
  (`setUseWalletTransactionForSend`), smart contract wallet detection with
  Sequence v3 and EIP-7702 exclusions, and returns flags for gating SCW-specific
  UX and permit flow routing.
  - Switch Sequence Connect config from WaaS-only to standard mode with
    `walletUrl`, `dappOrigin`, and optional WalletConnect
  - Add wallet adapter peer dependencies (`@metamask/connect-evm`,
    `@walletconnect/ethereum-provider`, `@coinbase/wallet-sdk`)
  - Bump wagmi to `^3.6.0`
  - Add `SendNative` component with block explorer link and auto-reset
  - Add dismissable `ScwBanner` for non-Sequence smart contract wallets

## 0.0.2

### Patch Changes

- fc29e47: Fix broken Sentry import in `main.tsx` (file was renamed `instrument.ts` → `sentry.ts` but the import was not updated). Add `noUncheckedSideEffectImports: true` to both the root `tsconfig.json` (inherited by Node packages) and the frontend `tsconfig.json` so TypeScript catches unresolvable side-effect imports rather than silently deferring them to the bundler.
- a2de5fe: Add `example-schemas` and `example-client` packages to implement the three-package monorepo pattern.

  `example-schemas` publishes Zod response schemas, an OpenAPI registry, and a committed `openapi.json`
  spec. `example-client` consumes the spec via orval to generate a typed fetch client and TanStack
  Query hooks. `example-rest-api` now imports schemas from the shared package and its tests assert
  against the typed client. `example-frontend` uses the client's React hooks to display the current
  block number.

  This establishes the template as the canonical reference for the schemas/service/client pattern
  documented in `apps-team-ops/docs/best-practices/backend.md`.

- Updated dependencies [a2de5fe]
  - @polygonlabs/example-client@0.2.0
