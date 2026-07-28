## 1. Extend ManualTransferData type

- [x] 1.1 Add `reference_amount?: string` and `reference_currency?: string` to `ManualTransferData` in `packages/frontend/react/src/types.ts`

## 2. Thread fiat context through PendingScreen

- [x] 2.1 In `PendingScreen.tsx`, replace `session.manual_transfer` passed to `ManualTransferSection` with a spread that merges `reference_amount: session.amount` and `reference_currency: session.currency`

## 3. Render exchange rate row in ManualTransferContent

- [x] 3.1 In `ManualTransferContent.tsx`, compute `rate = parseFloat(data.reference_amount) / parseFloat(data.crypto_amount)` when both fields are present
- [x] 3.2 If `Number.isFinite(rate)`, render a "Tipo de cambio" row below the token pills and above the "Transfiere este importe" heading, with value `1 ${data.crypto_asset} = ${formatFiatAmount(rate.toFixed(2), data.reference_currency!)}`

## 4. Update mock

- [x] 4.1 In `checkout-web/src/mocks/handlers.ts`, add `reference_amount: '93205.00'` and `reference_currency: 'ARS'` to the `mock-created` session's `manual_transfer` object

## 5. Build & verify

- [x] 5.1 Run `bun run build` in `packages/frontend/react` — no TypeScript errors
- [x] 5.2 `yalc publish --no-scripts` + `yalc update @fluxisus/react` in checkout-web, restart dev server
- [x] 5.3 Open `/checkout/mock-created`, expand "Transferencia manual" — confirm "Tipo de cambio" row shows `1 USDT = $ 1.570,32 ARS` (approximate), positioned above the copy fields; row absent on sessions without fiat context
