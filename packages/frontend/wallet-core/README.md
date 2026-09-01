# @fluxisus/wallet-core

Framework-agnostic EVM wallet connection primitives for Fluxis hosted checkout: EIP-6963 wallet
discovery, a small EVM chain registry, ERC-20 `transfer` calldata encoding, and a thin WalletConnect
v2 wrapper.

This package has no UI and no React dependency — see `@fluxisus/react-wallet` for the React hook
that wires these primitives into `HostedCheckoutWidget`'s props.

Not yet published to npm (`"private": true`). See `CLAUDE.md` for scope, design rules, and the
release-registration steps still pending before that changes.

## Install (once published)

```bash
npm install @fluxisus/wallet-core
```

## Usage

```ts
import { listenForProviders, catalogNameForProvider, WalletConnectConnector, chainForNetwork } from '@fluxisus/wallet-core';

const unsubscribe = listenForProviders((detail) => {
  const catalogName = catalogNameForProvider(detail); // e.g. "metamask", or undefined if unmapped
});

const connector = new WalletConnectConnector(projectId, {
  name: 'My Store',
  description: 'Checkout',
  url: 'https://mystore.example',
  icons: ['https://mystore.example/icon.png'],
});
const chain = chainForNetwork('polygon')!;
const { uri, approval } = await connector.connect(chain.chainId);
// render `uri` as a QR, then:
const { topic, address } = await approval();
```
