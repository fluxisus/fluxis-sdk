## 1. AddressFormat component

- [x] 1.1 Create `packages/frontend/react/src/components/checkout/AddressFormat.tsx` — props `address: string`, `boldChars?: number` (default 8); when `address.length > boldChars * 2` render three inline `<span>` segments (bold fg / muted / bold fg) in monospace; otherwise render the whole address bold

## 2. CopyField display prop

- [x] 2.1 Add `display?: React.ReactNode` to `CopyFieldProps` in `CopyField.tsx`
- [x] 2.2 In the visible text span, render `{display ?? value}` instead of `{value}`

## 3. Wire up in ManualTransferContent

- [x] 3.1 Import `AddressFormat` in `ManualTransferContent.tsx`
- [x] 3.2 On the "Dirección" `CopyField`, add `display={<AddressFormat address={data.wallet_address} />}` while keeping `value={data.wallet_address}`

## 4. Build & verify

- [x] 4.1 Run `bun run build` in `packages/frontend/react` — confirm no TypeScript errors
- [x] 4.2 `yalc publish` + `yalc update @fluxisus/react` in checkout-web
- [x] 4.3 Open `/checkout/mock-created`, expand "Transferencia manual" — confirm the Dirección field shows bold first-8 and last-8 chars with muted middle; Importe field unchanged; clipboard copy still copies the full address
