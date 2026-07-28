## 1. Type changes

- [x] 1.1 In `packages/frontend/react/src/types.ts`, add `tx_hash?: string` and `receipt_link?: string` to the `CheckoutSession` interface

## 2. Block explorer link (ConfirmingScreen)

- [x] 2.1 In `packages/frontend/react/src/components/checkout/StatusScreens.tsx`, add the `EXPLORER_BASE` record constant mapping network names to block explorer tx base URLs (polygon, base, ethereum, bsc, arbitrum, optimism, avalanche)
- [x] 2.2 Add `getExplorerUrl(session: CheckoutSession, txHash: string): string | null` helper in the same file
- [x] 2.3 Add `session?: CheckoutSession` prop to `ConfirmingScreen`, compute `explorerUrl`, and render a "Ver en blockchain →" anchor link below the spinner when `explorerUrl` is non-null

## 3. Receipt button (CompletedScreen)

- [x] 3.1 Add `session?: CheckoutSession` prop to `CompletedScreen` and render a secondary "Ver recibo" anchor styled as a button below the existing "Volver al comercio" button when `session.receipt_link` is present

## 4. Widget wiring

- [x] 4.1 In `packages/frontend/react/src/components/CheckoutWidget.tsx`, pass `session={session}` to `ConfirmingScreen` and `CompletedScreen`

## 5. Mock data & build

- [x] 5.1 In `checkout-web/src/mocks/handlers.ts`, add `tx_hash: "0xabc123..."` to the `mock-confirming` session fixture and `receipt_link` to `mock-completed`
- [x] 5.2 Run `bun run build` in `packages/frontend/react` — no TypeScript errors
- [x] 5.3 Run `yalc publish --no-scripts` in `packages/frontend/react`, then `yalc update @fluxisus/react` in `checkout-web`, clear `.vite` cache, restart dev server
- [x] 5.4 Open `/checkout/mock-confirming` — verify "Ver en blockchain →" link appears below spinner
- [x] 5.5 Open `/checkout/mock-completed` — verify "Ver recibo" button appears below "Volver al comercio"
