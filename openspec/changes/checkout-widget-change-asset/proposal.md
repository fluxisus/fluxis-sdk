## Why

Once a shopper picks an asset, `ManualTransferContent` offers no way back — if they picked the
wrong network, their only option was to let the session expire (8 minutes) and start over.
core-api's companion change (`checkout-session-asset-reselection`) now lets `select-asset` be
called again while a session is `created` and unexpired, releasing the previous vault and
assigning a new one; this change wires that up on the frontend.

## What Changes

- `ManualTransferContent` gains an optional `onChangeAsset?: () => void` prop, rendering a small
  "Cambiar" link next to the token/network pills when provided.
- `PendingScreen` tracks local `isChangingAsset` state: clicking "Cambiar" swaps the accordion body
  from `ManualTransferContent` back to `AssetSelectionScreen` (stepper drops to `activeStep={-1}`,
  matching the unresolved state); a successful `onSelectAsset` call resets it back to `false`.
  `onChangeAsset` is only wired up when `session.payment_options` is present (nothing to change to
  otherwise — matches core-api omitting `payment_options` for single-option sessions).
- No explicit "cancel without picking a new asset" affordance — resubmitting the currently active
  option is treated by the backend as a no-op, which doubles as a functional cancel.

## Capabilities

### Modified Capabilities
- `checkout-session`: `ManualTransferContent`/`PendingScreen` behavior for changing a resolved
  selection.

## Impact

- `src/components/checkout/ManualTransferContent.tsx` (`onChangeAsset` prop)
- `src/components/checkout/PendingScreen.tsx` (`isChangingAsset` state, wrapped select handler)
- `tests/AssetSelectionScreen.test.tsx` (new round-trip test)
- Depends on core-api's `checkout-session-asset-reselection` (backend must accept the repeat
  `select-asset` call) and `checkout-session-payment-option-labels` (`payment_options` must survive
  resolution for the picker to have something to render)
