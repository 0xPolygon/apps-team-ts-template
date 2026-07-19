# example-frontend

## 1.0.9

### Patch Changes

- [#62](https://github.com/0xPolygon/apps-team-ts-template/pull/62) [`90dc551`](https://github.com/0xPolygon/apps-team-ts-template/commit/90dc551650f743fa9ab29084ae52728db6a7c213) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Ship the LICENSE file inside each package directory

  The previous release added the Apache-2.0 license at the repo root and
  declared it in package.json, but npm only auto-includes a LICENSE file
  in the packed tarball when it lives in the same directory as the
  package's own package.json. These packages are all private today, but
  this keeps the pattern correct for any package that publishes later.

- [#63](https://github.com/0xPolygon/apps-team-ts-template/pull/63) [`357ff03`](https://github.com/0xPolygon/apps-team-ts-template/commit/357ff03103e48718f5883ae34781581db85ed4b4) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Update dependencies to resolve reported security advisories.

  The REST API's auth tests now account for `@polygonlabs/express` 4.1 running request validation before auth handlers — a malformed request to a protected route returns 400 (validation error) instead of 401. See that package's MIGRATION.md.

- [#63](https://github.com/0xPolygon/apps-team-ts-template/pull/63) [`558993e`](https://github.com/0xPolygon/apps-team-ts-template/commit/558993eb639c37111053e086356cf28cdea61526) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Upgrade `@polygonlabs/wallet-kit` to 2.0.x.

  The example frontend does not use the screening subsystem that 2.0 reworked, so this is a drop-in version alignment with no behavioral change. Peer dependencies are unchanged between the two majors; the upgrade pulls in `@polygonlabs/api-gateway-client` as a new transitive.

- Updated dependencies [[`54c3c82`](https://github.com/0xPolygon/apps-team-ts-template/commit/54c3c82cdb02f951fdf28db484955905089c7eca), [`90dc551`](https://github.com/0xPolygon/apps-team-ts-template/commit/90dc551650f743fa9ab29084ae52728db6a7c213)]:
  - @polygonlabs/example-client@0.6.1

## 1.0.8

### Patch Changes

- [#60](https://github.com/0xPolygon/apps-team-ts-template/pull/60) [`bcec096`](https://github.com/0xPolygon/apps-team-ts-template/commit/bcec096723b0875b7696ef63251e3580c9bf8e2b) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Add Apache-2.0 license

  The repository now ships an Apache License 2.0 `LICENSE` file at the root, and every package declares `"license": "Apache-2.0"` in its `package.json`.

- Updated dependencies [[`bcec096`](https://github.com/0xPolygon/apps-team-ts-template/commit/bcec096723b0875b7696ef63251e3580c9bf8e2b), [`35e35fa`](https://github.com/0xPolygon/apps-team-ts-template/commit/35e35fa75acba3a2658ec96a17b6ff995c7814f7)]:
  - @polygonlabs/example-client@0.6.0

## 1.0.7

### Patch Changes

- [#52](https://github.com/0xPolygon/apps-team-ts-template/pull/52) [`606a2b5`](https://github.com/0xPolygon/apps-team-ts-template/commit/606a2b56ed9d38bb86b79a3af6708037709ff0b2) Thanks [@MaximusHaximus](https://github.com/MaximusHaximus)! - Adopt @polygonlabs/express 4.0.0 + @polygonlabs/logger 3.0.0 in the reference service, and scope every workspace package under @polygonlabs/.

  ## @polygonlabs/example-rest-api
  - `@polygonlabs/express` ^3.0.0 → ^4.0.0, `@polygonlabs/logger` ^2.1.0 → ^3.0.0, `@polygonlabs/verror` ^1.0.4 → ^1.1.0. No code changes were required: the v4/v3 majors move RPC fetch-error sanitisation into `@polygonlabs/verror`'s `serializeError` / `VError.toJSON` (adding viem coverage) and rename the internal `sanitiseEthersFetchError` export to `sanitiseRpcFetchError` — none of which this service touches directly.
  - Package renamed `example-rest-api` → `@polygonlabs/example-rest-api`. The Docker image name is unchanged (the shared docker-test composite strips the scope), and the changeset git tag is now `@polygonlabs/example-rest-api@x.y.z` — the docker-release trigger's generic tag patterns already match scoped tags, so no workflow change is required.

  ## @polygonlabs/example-frontend
  - Package renamed `example-frontend` → `@polygonlabs/example-frontend` (all-packages-scoped policy; no behaviour change).

## 1.0.6

### Patch Changes

- Updated dependencies [b598714]
  - @polygonlabs/example-client@0.5.0

## 1.0.5

### Patch Changes

- 9cea326: Demonstrate the canonical wrapper-error narrowing pattern end-to-end:
  - A new `<ApiErrorMessage>` component (`src/components/api-error-message.tsx`)
    consumes per-client guards re-exported from `@polygonlabs/example-client`
    (`isTransportError`, `isUnknownError`) and TS flow-narrows the rest.
    No `as` casts, no schema imports at the UI layer — just the wrapper
    return type. Stable `data-error-category` attribute on the rendered
    alert routes Playwright assertions and Sentry telemetry without
    scraping copy.
  - A new `reportApiError` Sentry adapter (`src/lib/report-api-error.ts`)
    uses the cross-client `categorizeApiError` helper from
    `@polygonlabs/zod-to-openapi-heyapi/errors` (not the per-client guards)
    — that's the canonical split: per-client guards in component code
    where the wrapper return type is in scope; the cross-client helper
    in adapters that route on category without caring which operation
    produced the error. Tags every Sentry event with
    `api.error.kind: transport | unknown | native-error | other` so
    dashboards can filter without parsing messages, and attaches the
    wire body + Zod issues as a Sentry context for the `unknown`
    (schema-drift) category.
  - Wired into the global `QueryCache.onError` /
    `MutationCache.onError` in `src/app.tsx`; the `codec-test` panel
    passes `meta.operation` per call site so every Sentry event
    carries a stable per-operation tag without per-component plumbing.

  Unit coverage: 6 tests pin the `<ApiErrorMessage>` narrowing pattern
  (structurally-real fixtures, no schema imports), 4 tests pin the
  `reportApiError` category → tag mapping.

- cbe1639: Adopt the codec-aware TanStack Query factories from
  `@polygonlabs/zod-to-openapi-heyapi` v1.2's new `tanstackReactQuery: true`
  option (wired via the new `defineRegistryClientConfig` factory). The
  factory installs the upstream `@hey-api/openapi-ts`
  `@tanstack/react-query` plugin alongside the registry plugin, with a
  parser-level `isQuery: false` hook scoped to codec op ids — so codec
  ops get factories from the registry plugin (typed against `${Op}Input`,
  codec slots pre-encoded into the queryKey) and non-codec ops keep the
  standard wire-shape factories from upstream. Same names across both
  emissions, no collisions.

  ```ts
  useQuery(getBlockMetadataOptions({ path: { blockNumber: 23000000n } }));
  ```

  `getBlockMetadataOptions` and other codec-aware factories are now
  exported from `@polygonlabs/example-client/react`, which split-imports
  the codec-ops half from `registry-validator.gen.ts` and the non-codec
  half from `@tanstack/react-query.gen.ts`. Codec slots in the queryKey
  are pre-encoded synchronously (`z.encode(Schema, value)`), so the
  default `JSON.stringify`-based queryKeyHashFn stays stable for `bigint`
  inputs without consumer-side ceremony — the bigint-aware
  `queryKeyHashFn` override on the example-frontend `QueryClient` has
  been removed.

  The codec-test panel uses the canonical factory directly via
  `useQuery({ ...getBlockMetadataOptions(...), enabled: false })` and
  guards `BigInt(blockHeight)` against empty / non-numeric input so an
  invalid value disables the fetch button instead of crashing the
  panel during render.

- 725f6ba: Follow `@polygonlabs/zod-to-openapi-heyapi`'s rename of `UnknownError`
  to `ResponseValidationError`. The new name describes the layer the
  failure happened in (response-side validation), symmetric with
  `TransportError` (transport-layer failure) and unambiguous against
  request-side `z.encode` failures the plugin also runs.
  - `packages/example-client` re-exports `ResponseValidationError` and
    `isResponseValidationError` (replacing the old names).
  - `packages/example-frontend`'s `<ApiErrorMessage>` narrows via
    `isResponseValidationError` and tags the rendered alert with
    `data-error-category="response-validation"`.
  - `reportApiError` (Sentry adapter) tags events with
    `api.error.kind: response-validation` and attaches the wire body +
    full `ZodError` under `api.response-validation`. The structural
    `ResponseValidationError.cause` type from the plugin's `/errors`
    subpath is now the full `ZodError`, so `.format()` / `.flatten()` /
    `.issues` are reachable without a cast.

- Updated dependencies [7a5b161]
- Updated dependencies [95385cf]
- Updated dependencies [cbe1639]
- Updated dependencies [725f6ba]
- Updated dependencies [956d94c]
  - @polygonlabs/example-client@0.4.0

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
