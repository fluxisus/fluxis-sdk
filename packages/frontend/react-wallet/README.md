# @fluxisus/react-wallet

React hook that wires [`@fluxisus/wallet-core`](../wallet-core) into
[`@fluxisus/react`](../react)'s `HostedCheckoutWidget` wallet-connection props (EIP-6963 extension
detection + WalletConnect v2 pairing + sending the ERC-20/native transfer). Entirely optional —
`HostedCheckoutWidget` works exactly as before without it.

Not yet published to npm (`"private": true`). See `CLAUDE.md` for scope and release-registration
steps still pending.

## Install (once published)

```bash
npm install @fluxisus/react-wallet @fluxisus/wallet-core
```

## Usage

```tsx
import { HostedCheckoutWidget } from '@fluxisus/react';
import { useHostedCheckoutWallet } from '@fluxisus/react-wallet';

function Checkout({ session, checkoutUrl }) {
  const wallet = useHostedCheckoutWallet(session, {
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    resolveErc20: async ({ cryptoAsset, network }) => {
      // Look up token_address/decimals for this asset — typically from the same
      // unique-asset catalog passed as `uniqueAssetsUrl` to HostedCheckoutWidget.
      return { tokenAddress: '0x...', decimals: 6 };
    },
  });

  return <HostedCheckoutWidget session={session} checkoutUrl={checkoutUrl} {...wallet} />;
}
```

## Scope

EVM only (Arbitrum, Base, Polygon — see `@fluxisus/wallet-core`'s `chains.ts`). No non-EVM support,
no iframe/postMessage bridge — see `CLAUDE.md` and `../wallet-core/CLAUDE.md` for the full list of
what this does and doesn't cover yet.
