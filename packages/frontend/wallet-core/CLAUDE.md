# CLAUDE.md — @fluxisus/wallet-core

> Framework-agnostic EVM wallet connection (EIP-6963 discovery + WalletConnect v2 + ERC-20 transfer
> building) for Fluxis hosted checkout. For shared frontend rules see `packages/frontend/CLAUDE.md`.
> For the React binding built on top of this, see `packages/frontend/react-wallet/CLAUDE.md`.

## Why this is a separate package from `@fluxisus/react`

`@fluxisus/react`'s `HostedCheckoutWidget` deliberately makes no network or chain calls of its own —
see the JSDoc on `onPayWithWallet` in `packages/frontend/react/src/types.ts` and design rule #2 in
`packages/frontend/CLAUDE.md`. Wallet connection is real business logic (RPC calls, WalletConnect
pairing, transaction signing) with real dependencies — it does not belong in a package whose design
rule is "minimal deps, no chain calls." This package is entirely **optional**: integrators who only
need the manual-transfer flow never install it, and nothing about `@fluxisus/react`'s public API
changes because this package exists.

## Scope (v1)

- **EVM only.** See `src/chains.ts` — chain keys match the `network` strings already used by
  `CheckoutSession.manual_transfer.network` and by the unique-asset catalog
  (`unique_asset_ids.json`). Adding a non-EVM chain is a v2 concern and would likely need its own
  sibling package (e.g. `@fluxisus/wallet-core-svm`) rather than bending this one's EVM-shaped API.
- **No React.** Pure TypeScript, testable headless. `@fluxisus/react-wallet` is the React binding.
- **No UI.** This package never renders anything — it returns data (a pairing URI, an address, a
  tx hash) and lets the caller decide how to display it.

## What's in here

- `chains.ts` — the EVM chain registry (chainId, RPC URLs, native currency) keyed by network name.
- `providers.ts` — EIP-6963 multi-wallet discovery (`listenForProviders`), plus the `rdns` → Fluxis
  wallet-catalog `name` mapping needed to populate `installedWalletNames`.
- `erc20.ts` — hand-rolled `transfer(address,uint256)` calldata encoding and decimal-string → bigint
  conversion. No viem/ethers dependency — this one ABI call doesn't need a whole library.
- `walletConnect.ts` — thin wrapper over `@walletconnect/sign-client`, the only real runtime
  dependency this package has.

## What NOT to do

- Do NOT add viem/ethers/wagmi as dependencies for a single ABI call — `erc20.ts` exists precisely
  to avoid that.
- Do NOT import React or any UI library here.
- Do NOT hardcode a WalletConnect Project ID — it's always caller-supplied config.
- Do NOT assume `window.ethereum` — always go through EIP-6963 (`providers.ts`), since a page can
  have zero, one, or several injected wallets.

## Known limitation — iframe embedding

Most wallet extensions inject into every frame by default (manifest `all_frames: true`), so
EIP-6963 discovery should work inside a merchant's iframe without extra code. But if the merchant's
`<iframe>` has a `sandbox` attribute without `allow-same-origin`, extensions cannot inject and
`installedWalletNames` will simply come back empty (WalletConnect still works — it's just a URI).
No bridge is implemented for this today; document the iframe requirement for merchants who embed the
checkout, rather than building a postMessage bridge nobody has asked for yet.

## Release status

Not yet registered in `release-please-config.json` / `.release-please-manifest.json` / the
`publish-*` jobs in `.github/workflows/release-please.yml` — `package.json` is `"private": true`
until the team decides to publish it. See `packages/frontend/README.md` for the registration steps.

## Build & Test

```bash
npm run build --workspace=packages/frontend/wallet-core
npm run test --workspace=packages/frontend/wallet-core
npm run lint --workspace=packages/frontend/wallet-core
```
