## Why

Today, `CheckoutWidget` renders `AssetSelectionScreen` as a full-screen picker (no QR at all) whenever `session.status === 'selecting_asset'`. A shopper with a NASPIP-compatible wallet app is forced through this page-level picker before ever seeing anything scannable, even though (as of core-api's `checkout-session-undecided-qr` change) the session now carries an undecided NASPIP token in that state — a wallet can resolve the asset choice itself. Only manual transfer genuinely needs the shopper to pick an asset first, since it displays one specific resolved address. Verified live against the local stack (screenshots) that the QR-first `PendingScreen` layout is otherwise correct and shouldn't change — only what triggers it and what the manual-transfer accordion shows before an asset is picked needed to change.

Also found and fixed in the same area: `ManualTransferContent`'s `StepIndicator` (`Token → Red → Pagar`) was hardcoded to `activeStep={2}`, so all three steps always rendered fully "done" (green) regardless of where the shopper actually was — confirmed via code read, never conditional on real progress.

## What Changes

- `CheckoutWidget` no longer branches to a standalone `AssetSelectionScreen` for `selecting_asset` — that status now falls through to `PendingScreen` (same as `pending`), which receives a new `onSelectAsset` prop.
- `PendingScreen`'s manual-transfer accordion renders `AssetSelectionScreen` (asset picker) when no asset is resolved yet (`selecting_asset`, no `manual_transfer`), or `ManualTransferContent` (amount/address/QR) once resolved — same accordion shell either way, no full-screen transition between the two.
- `ManualTransferSection` is generalized from a `{ data }` prop to `{ activeStep, children }` — a generic accordion shell, decoupled from what's inside it.
- `StepIndicator` is hoisted out of `ManualTransferContent` into `ManualTransferSection`, now driven by real progress: `activeStep={-1}` while picking (nothing done), `activeStep={1}` once resolved (Token+Red done via the single asset pick; "Pagar" is the current, not-yet-done step — this component unmounts once payment is detected, so "Pagar" is never observably "done" from here).
- `AssetSelectionScreen` drops its own outer card styling (background/border/padding) and title ("Elegí cómo pagar") — both were redundant once nested inside `ManualTransferSection`'s own bordered accordion body (found via live visual check: boxed-in-a-box).

## Capabilities

### Modified Capabilities
- `checkout-session`: supersedes `checkout-widget-v2`'s "CheckoutWidget renders an asset picker for selecting_asset sessions" requirement — the picker now lives inside the manual-transfer accordion, not as `CheckoutWidget`'s own top-level branch.
- `checkout-widget`: adds the `StepIndicator` progress-accuracy requirement.

## Impact

- `src/components/CheckoutWidget.tsx`
- `src/components/checkout/PendingScreen.tsx`
- `src/components/checkout/ManualTransferSection.tsx`
- `src/components/checkout/ManualTransferContent.tsx`
- `src/components/checkout/AssetSelectionScreen.tsx`
- `tests/AssetSelectionScreen.test.tsx`
- No change to `CheckoutSession`/`CheckoutWidgetProps` types — `recipient_address`/`payment_options` were already independently optional, no discriminated union to update
