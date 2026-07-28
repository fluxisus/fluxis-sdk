## 1. CheckoutSession type

- [x] 1.1 Add `'selecting_asset'` to `CheckoutSession.status` union and `payment_options?: string[]` to `CheckoutSession` (`src/types.ts`)
- [x] 1.2 Add `onSelectAsset?: (assetId: string) => void | Promise<void>` to `CheckoutWidgetProps` (`src/types.ts`)

## 2. Auto-redirect on completion

- [x] 2.1 Add a 5-second countdown timer to `CompletedScreen` (`src/components/checkout/StatusScreens.tsx`) that navigates to `returnUrl` on elapse
- [x] 2.2 Display the countdown next to the manual "Volver al comercio" link
- [x] 2.3 Clear the timer on unmount
- [x] 2.4 Test: auto-redirect fires after 5s with no interaction (use fake timers)
- [x] 2.5 Test: manual link points at `returnUrl` immediately, independent of the countdown
- [x] 2.6 Test: unmounting before 5s clears the timer (no navigation call after unmount)

## 3. Asset selection screen

- [x] 3.1 Create `AssetSelectionScreen` (`src/components/checkout/AssetSelectionScreen.tsx`) rendering `session.payment_options` and calling `onSelectAsset` on click, with a loading state while the callback's promise is pending
- [x] 3.2 Wire `CheckoutWidget` to dispatch to `AssetSelectionScreen` when `session.status === 'selecting_asset'`
- [x] 3.3 ~~Export `AssetSelectionScreen` from `src/index.ts`~~ — checked existing pattern: `PendingScreen`/`StatusScreens` sub-screens are internal to `CheckoutWidget` and not individually exported; `AssetSelectionScreen` follows the same convention
- [x] 3.4 Test: renders all `payment_options`, calls `onSelectAsset` with the clicked option
- [x] 3.5 Test: renders without throwing when `onSelectAsset` is not supplied
- [x] 3.6 Test: `CheckoutWidget` dispatches to `AssetSelectionScreen` for `selecting_asset` sessions
- [x] 3.7 (added during implementation) Test: shows an inline error and resets when `onSelectAsset` rejects
- [x] 3.8 (added during implementation) Fixed a pre-existing type error: `PaymentStatusBadge`'s `STATUS_CONFIG` record needed a `selecting_asset` entry once the status union grew

## 4. Documentation

- [x] 4.1 Update `packages/frontend/react/README.md`: document `selecting_asset`/`payment_options` in the `CheckoutSession` contract, `onSelectAsset` usage example, and the 5s auto-redirect behavior
- [x] 4.2 Update `packages/frontend/CLAUDE.md`: clarify that "poll status via your API routes" describes third-party merchant integrations; checkout-web (first-party) calling core-api's public, credential-free checkout endpoints directly is accepted and not a violation

## 5. Verification

- [x] 5.1 `npm run test --workspace=packages/frontend/react` passes (48/48)
- [x] 5.2 `npm run lint --workspace=packages/frontend/react` passes
- [x] 5.3 `npm run build --workspace=packages/frontend/react` passes (type-checks the new props/exports)
