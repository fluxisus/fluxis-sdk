## 1. Localize PaymentStatusBadge labels

- [x] 1.1 In `packages/frontend/react/src/components/PaymentStatusBadge.tsx`, update `STATUS_CONFIG` labels: `pending → "Pendiente"`, `confirming → "Confirmando"`, `completed → "Completado"`, `expired → "Expirado"`

## 2. Integrate into PendingScreen

- [x] 2.1 Import `PaymentStatusBadge` in `PendingScreen.tsx` from `'../PaymentStatusBadge.js'`
- [x] 2.2 After the `<DetailRow label="Referencia" ... />`, add a custom "Estado" row (inline div matching the Expira en pattern) rendering `<PaymentStatusBadge status={session.status} />`

## 3. Build & verify

- [x] 3.1 Run `bun run build` in `packages/frontend/react` — no TypeScript errors
- [x] 3.2 `yalc publish --no-scripts` + `yalc update @fluxisus/react` in checkout-web, clear `.vite` cache, restart dev server
- [x] 3.3 Open `/checkout/mock-created` — confirm "Estado" row shows a blue "Pendiente" pill in the detail section
