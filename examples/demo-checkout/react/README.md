# demo-checkout/react

Temporary React playground for `@fluxisus/react`'s `HostedCheckoutWidget`. Not published — for
local manual testing only.

The `CheckoutSession` this widget needs is a frontend-only shape produced by a hosted-checkout
backend, not by `@fluxisus/sdk` — there's no client call that returns one. This demo builds one by
hand in the controls panel instead, so you can exercise every `status`/`manual_transfer` shape and
every host-supplied callback (`onSelectAsset`, `onPayWithWallet`, `onSelectWalletConnect`,
`onPrepareWalletConnect`, `onLaunchExtension`, `onRetryExpired`) without a real backend.

## Prerequisites

Build the SDKs once (or run them in watch mode):

```bash
npm run build --workspace=packages/frontend/react
npm run build --workspace=packages/frontend/wallet-core
npm run build --workspace=packages/frontend/react-wallet
```

To test the **"Use real wallet"** toggle (real EIP-6963 extension detection + a real WalletConnect
pairing, via `@fluxisus/react-wallet`), copy `.env.example` to `.env.local` and fill in a real
WalletConnect Cloud / Reown project id. Without it, extension connect/pay still works — only the
"Otras wallets" QR pairing needs the project id.

## Run

From the repo root:

```bash
npm install
npm run dev --workspace=examples/demo-checkout/react
```

Open http://localhost:5174

## What to try

- Toggle **status** to see `HostedCheckoutWidget`'s status-routed screens (`pending`,
  `selecting_asset`, `confirming`, `completed`, `expired`).
- Toggle **session already has manual_transfer** to check that the flow starts directly on the
  "pay" step instead of the token picker.
- Toggle **only one asset available** to check the token/network re-selection guards.
- Toggle **force error** on the wallet-selection and pay-with-wallet simulations to see the
  widget's error states.
- Click **Restart session** to get a fresh `id` (forces a remount via `key={session.id}`, the same
  pattern used to reset `HostedCheckoutWidget`'s internal `forceExpired` latch in production).
- Watch the **event log** panel to confirm which callback fired and with what argument.

## Cleanup

This folder is intentionally temporary. Delete `examples/demo-checkout/react/` when you no longer
need the playground.
