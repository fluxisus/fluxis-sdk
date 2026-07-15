## Why

The `ConfirmingScreen` and `CompletedScreen` in `CheckoutWidget` currently display fixed UI with no session context. As core-api now returns `tx_hash` and `receipt_link` on the checkout session endpoint, the SDK should surface these to give payers traceability (block explorer link) and a shareable receipt URL.

## What Changes

- `CheckoutSession` type gains two optional fields: `tx_hash?: string` and `receipt_link?: string`
- `ConfirmingScreen` accepts an optional `session` prop and renders a "Ver en blockchain →" link when `tx_hash` is present and a known network is detected
- `CompletedScreen` accepts an optional `session` prop and renders a "Ver recibo" secondary button when `receipt_link` is present
- `CheckoutWidget` passes `session` to both screens

## Capabilities

### New Capabilities
- `checkout-tx-explorer-link`: Show a block explorer link in ConfirmingScreen when `tx_hash` and a recognized network are present on the session
- `checkout-receipt-button`: Show a "Ver recibo" button in CompletedScreen when `receipt_link` is present on the session

### Modified Capabilities
- `checkout-session`: `CheckoutSession` type gains `tx_hash` and `receipt_link` optional fields

## Impact

- `packages/frontend/react/src/types.ts` — `CheckoutSession` interface
- `packages/frontend/react/src/components/CheckoutWidget.tsx` — prop pass-through
- `packages/frontend/react/src/components/checkout/StatusScreens.tsx` — `ConfirmingScreen` + `CompletedScreen`
- No new runtime dependencies; no breaking changes (all new props are optional)
