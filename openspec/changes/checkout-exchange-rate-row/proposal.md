## Why

When a shopper opens the manual transfer accordion they see a crypto amount (e.g. `59.371585 USDT`) but have no way to verify it matches what they agreed to pay in fiat. A "Tipo de cambio" row derived from dividing the fiat amount by the crypto amount gives them a quick sanity check — no extra API call needed.

## What Changes

- Add `reference_amount?: string` and `reference_currency?: string` to `ManualTransferData` so the fiat context can travel with the payment data.
- In `PendingScreen`, merge `session.amount` and `session.currency` into the `ManualTransferData` object before passing it to `ManualTransferSection`.
- In `ManualTransferContent`, when both fields are present, render a "Tipo de cambio" row showing `1 {crypto_asset} = {fiat rate}` above the copy fields.
- Update the `mock-created` handler in `checkout-web` to include `reference_amount` and `reference_currency` so the row appears during local testing.

## Capabilities

### New Capabilities

- `exchange-rate-row`: Displays an implied exchange rate inside the manual transfer section, derived purely from existing session data.

### Modified Capabilities

## Impact

- **`packages/frontend/react/src/types.ts`** — two new optional fields on `ManualTransferData`
- **`packages/frontend/react/src/components/checkout/PendingScreen.tsx`** — merges fiat fields when passing `manual_transfer`
- **`packages/frontend/react/src/components/checkout/ManualTransferContent.tsx`** — conditional rate row
- **`checkout-web/src/mocks/handlers.ts`** — mock-created updated (separate repo, noted for reference)
- No breaking changes; `reference_amount` / `reference_currency` are optional so existing consumers are unaffected
