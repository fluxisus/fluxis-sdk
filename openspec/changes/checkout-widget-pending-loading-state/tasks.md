## 1. Type Update

- [ ] 1.1 In `packages/frontend/react/src/types.ts`, change `recipient_address: string` to `recipient_address?: string` on `CheckoutSession`

## 2. PendingScreen Loading State

- [ ] 2.1 In `PendingScreen.tsx`, add a guard: when `session.recipient_address` is falsy, render a centered spinner and waiting message instead of the QR/wallet section
- [ ] 2.2 Match the spinner markup/animation to the one used in `ConfirmingScreen.tsx`
- [ ] 2.3 Verify the existing QR + wallet UI path is unchanged when `recipient_address` is present

## 3. Verification

- [ ] 3.1 Open `/checkout/mock-pending` in checkout-web — confirm spinner renders, no "Invalid NASPIP token"
- [ ] 3.2 Open `/checkout/mock-created` — confirm QR and wallet icons still render correctly
- [ ] 3.3 Run `bun build` in `packages/frontend/react` — confirm no TypeScript errors
