## Why

The `PendingScreen` detail rows show amount, expiry, and reference but no explicit status label. A colored badge in that section gives shoppers and merchants a clear at-a-glance signal without requiring them to infer status from the UI state.

## What Changes

- `PaymentStatusBadge` component labels updated from English to Spanish (`Pendiente`, `Confirmando`, `Completado`, `Expirado`)
- An "Estado" row added to `PendingScreen`'s detail section rendering `<PaymentStatusBadge status={session.status} />` on the right

## Capabilities

### New Capabilities
- `checkout-payment-status-badge`: Status badge pill in the PendingScreen detail rows showing the current payment session status with color semantics

### Modified Capabilities
<!-- none -->

## Impact

- **SDK**: `packages/frontend/react/src/components/PaymentStatusBadge.tsx` (label update), `PendingScreen.tsx` (add "Estado" row)
- **No breaking changes** — `PaymentStatusBadge` is already exported; prop interface unchanged
