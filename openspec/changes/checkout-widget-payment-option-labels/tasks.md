## 1. Structured payment_options type

- [x] 1.1 Add `CheckoutPaymentOption { unique_asset_id, symbol, network }` (`src/types.ts`); `CheckoutSession.payment_options?: CheckoutPaymentOption[]` (was `string[]`)
- [x] 1.2 Export `CheckoutPaymentOption` from `src/index.ts`

## 2. AssetSelectionScreen

- [x] 2.1 Drop `parseAssetOption` and the truncated-address display
- [x] 2.2 Render `option.symbol` (primary) + `capitalizeFirst(option.network)` (secondary) per button, keyed by `option.unique_asset_id`

## 3. Tests

- [x] 3.1 `tests/AssetSelectionScreen.test.tsx`: fixture updated to the object shape, using two same-network-different-symbol options (USDT + USDC, both Polygon) to mirror the real bug; assertions updated from network-text click targets to symbol-text

## 4. Verification

- [x] 4.1 `tsc --noEmit` passes, `npm run test --workspace=packages/frontend/react` passes
- [x] 4.2 `yalc publish` + `yalc add` in checkout-web; `checkout-web`'s own local `CheckoutSession` type (`src/lib/api.ts`) updated to match
- [x] 4.3 Manual verification: the local test POS's two Polygon options (USDT, USDC) now render as distinct, legible buttons instead of two identical "Polygon" buttons
