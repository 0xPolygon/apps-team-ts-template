---
'example-frontend': major
---

Add Sequence v3 wallet handling patterns and send-native transaction example.

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
