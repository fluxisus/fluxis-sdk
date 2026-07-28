## Why

Live verification found a real bug: `AssetSelectionScreen` only ever parsed the *network* out of
each `payment_options` entry (`parseAssetOption`, regex on the raw `unique_asset_id`), so two
options on the same network — the local test POS's actual configuration, USDT + USDC, both Polygon
— rendered as two identical "Polygon" buttons, distinguished only by a truncated token-contract
address (not meaningful to a shopper). core-api's companion change
(`checkout-session-payment-option-labels`) now resolves and sends a real symbol + network per
option, so the SDK no longer needs to (and shouldn't) guess from the id string.

## What Changes

- `CheckoutSession.payment_options` becomes `CheckoutPaymentOption[]`
  (`{unique_asset_id, symbol, network}`) instead of `string[]` — new exported type
  `CheckoutPaymentOption`.
- `AssetSelectionScreen` drops `parseAssetOption` and the truncated-address display entirely;
  renders `option.symbol` (e.g. "USDC") and `option.network` (e.g. "Polygon") directly from the
  structured option.

## Capabilities

### Modified Capabilities
- `checkout-session`: `CheckoutSession.payment_options` shape.

## Impact

- `src/types.ts` (`CheckoutPaymentOption`, `CheckoutSession.payment_options`)
- `src/index.ts` (export `CheckoutPaymentOption`)
- `src/components/checkout/AssetSelectionScreen.tsx`
- `tests/AssetSelectionScreen.test.tsx`
- Coordinated with core-api's `checkout-session-payment-option-labels` (must ship together — this
  is a breaking shape change, not additive)
