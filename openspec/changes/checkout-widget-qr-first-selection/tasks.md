## 1. Route selecting_asset through PendingScreen

- [x] 1.1 Remove `CheckoutWidget`'s standalone `selecting_asset` → `AssetSelectionScreen` branch; let it fall through to `PendingScreen`, passing `onSelectAsset`
- [x] 1.2 `PendingScreen` accepts new optional `onSelectAsset` prop

## 2. Manual-transfer accordion shows picker or content

- [x] 2.1 Generalize `ManualTransferSection` from `{ data }` to `{ activeStep, children }`
- [x] 2.2 `PendingScreen`'s accordion block renders `ManualTransferContent` (resolved) or `AssetSelectionScreen` (unresolved, `selecting_asset`) as `ManualTransferSection`'s children, with the corresponding `activeStep`

## 3. StepIndicator reflects real progress

- [x] 3.1 Hoist `StepIndicator` out of `ManualTransferContent` into `ManualTransferSection`
- [x] 3.2 `activeStep={-1}` while picking, `activeStep={1}` once resolved (see design.md decision 3 for why not `2`)

## 4. Visual cleanup (found live, not pre-planned)

- [x] 4.1 Strip `AssetSelectionScreen`'s own card background/border/padding and "Elegí cómo pagar" title — redundant once nested inside `ManualTransferSection`'s accordion body (box-in-a-box, confirmed via screenshot)

## 5. Tests

- [x] 5.1 Update `tests/AssetSelectionScreen.test.tsx`'s `CheckoutWidget` integration test — picker no longer reachable without expanding "Transferencia manual" first
- [x] 5.2 Full suite (`npm run test --workspace=packages/frontend/react`) passes — 48/48, no regressions in unrelated suites

## 6. Verification

- [x] 6.1 `tsc --noEmit` passes, `npm run build --workspace=packages/frontend/react` succeeds
- [x] 6.2 `yalc publish` + `yalc add` in checkout-web, preview server (not dev — avoids MSW interception) rebuilt and restarted
- [x] 6.3 Manual verification against the local stack: fresh `selecting_asset` session shows the QR immediately; expanding "Transferencia manual" shows the picker with the stepper all-grey; selecting an option transitions in place (no full-screen swap) to `ManualTransferContent` with `Token`/`Red` green and `Pagar` not, status flips to "Pendiente"
