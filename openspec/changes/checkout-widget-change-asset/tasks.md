## 1. "Cambiar" affordance

- [x] 1.1 `ManualTransferContent` gains optional `onChangeAsset?: () => void` prop, rendering a "Cambiar" link next to the token/network pills when provided
- [x] 1.2 `PendingScreen`: new `isChangingAsset` state; `handleSelectAsset` wraps `onSelectAsset`, resetting `isChangingAsset` to `false` on success (a rejection propagates unchanged)
- [x] 1.3 Accordion branch: `session.manual_transfer && !isChangingAsset` → `ManualTransferContent` (with `onChangeAsset`, gated on `session.payment_options` being present); `session.status === 'selecting_asset' || (session.manual_transfer && isChangingAsset)` → `AssetSelectionScreen`

## 2. Tests

- [x] 2.1 New round-trip test in `tests/AssetSelectionScreen.test.tsx`: resolved session with `payment_options` → click "Cambiar" → picker reappears with the full option list → pick a different option → `onSelectAsset` called with the new id

## 3. Verification

- [x] 3.1 `tsc --noEmit` passes, `npm run test --workspace=packages/frontend/react` passes
- [x] 3.2 `yalc publish` + `yalc add` in checkout-web
- [x] 3.3 Manual verification against the local stack: resolve a session to one asset, click "Cambiar", pick the other configured option, confirm it updates in place (address/amount change, no full-screen transition, no error)
