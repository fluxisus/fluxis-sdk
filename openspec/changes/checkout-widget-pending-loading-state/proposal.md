## Why

`CheckoutWidget` renders "Invalid NASPIP token" in the QR area when `status` is `"pending"` and the session has no `recipient_address` — this happens while the vault hasn't been assigned yet (shopper hasn't selected a crypto asset). The widget has no concept of this sub-state and passes an absent `recipient_address` directly to `FluxisQrCode`, producing broken UI.

## What Changes

- **`recipient_address` becomes optional** in `CheckoutSession` — the backend only includes it after vault assignment, so the type must reflect that.
- **`PendingScreen` gains a loading state** — when `recipient_address` is absent, show a centered spinner and a short waiting message instead of the QR/wallet section. When `recipient_address` is present, the existing QR + wallet icon UI is unchanged.
- **Existing `pending` spec scenario is split** — the single "pending renders payment screen" scenario becomes two: one for the waiting sub-state (no address) and one for the ready sub-state (address present).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `checkout-widget`: The `pending` status scenario is split into two sub-states (waiting for vault vs. QR ready); `recipient_address` moves from required to optional in `CheckoutSession`.

## Impact

- `packages/frontend/react/src/types.ts` — `CheckoutSession.recipient_address: string` → `recipient_address?: string`
- `packages/frontend/react/src/components/checkout/PendingScreen.tsx` — add guard on `recipient_address` before rendering QR
- Consumers passing a `CheckoutSession` with `recipient_address` always present are unaffected — the change is additive
- The `checkout-widget` delta spec updates the existing `pending` scenario; all other scenarios are unchanged
