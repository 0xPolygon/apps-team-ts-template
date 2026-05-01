# example-frontend

## 1.0.4

### Patch Changes

- 155f133: Switch the integration tests and the block-number hook to the hey-api SDK shape: SDK functions return `{ data, error, ... }`; the singleton client is configured once via `client.setConfig({ baseUrl })` at app entry. The block-number wire field is now an `Int64Codec` digit string that the generated transformer decodes to `bigint` — callers receive `data.blockNumber: bigint`.
- Updated dependencies [38291ed]
- Updated dependencies [83b87da]
- Updated dependencies [155f133]
- Updated dependencies [1acf577]
  - @polygonlabs/example-client@0.3.0

## 1.0.3

### Patch Changes

- Updated dependencies [06b7d1d]
  - @polygonlabs/example-client@0.2.2

## 1.0.2

### Patch Changes

- 75855fd: Bump Vitest from 3.2 to 4.1 in both example packages. Vite itself stays on 7.x (Vitest 4 bundles Vite 7 by default), so the `ssr.resolve.conditions` wrapper in `example-rest-api/vitest.config.ts` is still required — Vite's SSR resolver ignores top-level `resolve.conditions` and tests against workspace library packages would otherwise fail to resolve their `@polygonlabs/source` export with no built `dist/`.

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
