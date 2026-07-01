## 1. Types and Exports Foundation

- [x] 1.1 Add `CheckoutSession` interface to `packages/frontend/react/src/types.ts`
- [x] 1.2 Add prop types `CheckoutWidgetProps`, `CountdownTimerProps`, `AddressCopyButtonProps`, `PaymentStatusBadgeProps`, `AmountDisplayProps` to `packages/frontend/react/src/types.ts`

## 2. AmountDisplay Component

- [x] 2.1 Create `packages/frontend/react/src/components/AmountDisplay.tsx` — renders formatted amount and currency using `Intl.NumberFormat`, uses CSS variable fallbacks
- [x] 2.2 Write Storybook stories for `AmountDisplay`: USD example and ARS example

## 3. PaymentStatusBadge Component

- [x] 3.1 Create `packages/frontend/react/src/components/PaymentStatusBadge.tsx` — colored pill for each status (`pending`=blue, `confirming`=amber, `completed`=green, `expired`=gray) using CSS variable fallbacks
- [x] 3.2 Write Storybook stories for `PaymentStatusBadge`: one story per status

## 4. AddressCopyButton Component

- [x] 4.1 Create `packages/frontend/react/src/components/AddressCopyButton.tsx` — truncated address display (first 8 … last 6), copy icon, 2-second "Copied!" feedback, `navigator.clipboard.writeText` with `try/catch`
- [x] 4.2 Write Storybook stories for `AddressCopyButton`: default state and "Copied!" feedback state

## 5. CountdownTimer Component

- [x] 5.1 Create `packages/frontend/react/src/components/CountdownTimer.tsx` — `useEffect` tick every second, `useServerTimeOffset` for clock-skew, MM:SS format, amber < 120 s, red < 60 s, `onExpire` callback at zero
- [x] 5.2 Write Storybook stories for `CountdownTimer`: normal (> 2 min), urgent (< 60 s), and expired states

## 6. CheckoutWidget Component

- [x] 6.1 Create `packages/frontend/react/src/components/CheckoutWidget.tsx` — `pending` layout composing `AmountDisplay`, `CountdownTimer`, `FluxisQrCode`, `CompatibleApps`, `AddressCopyButton`
- [x] 6.2 Add `confirming` layout to `CheckoutWidget` — spinner + "Payment detected, confirming on-chain…" text
- [x] 6.3 Add `completed` layout to `CheckoutWidget` — checkmark icon + "Return to merchant" link (`session.return_url`)
- [x] 6.4 Add `expired` layout to `CheckoutWidget` — expiry message + start-over action
- [x] 6.5 Write Storybook stories for `CheckoutWidget`: one story per status (`pending`, `confirming`, `completed`, `expired`) plus mobile vs desktop variant for `pending`

## 7. Public Exports

- [x] 7.1 Export all five new components from `packages/frontend/react/src/index.ts`
- [x] 7.2 Export `CheckoutSession` and all five component prop types from `packages/frontend/react/src/index.ts`

## 8. Build and Tests

- [x] 8.1 Run `npm run build --workspace=packages/frontend/react` and confirm no TypeScript or bundler errors
- [x] 8.2 Run `npm run lint --workspace=packages/frontend/react` and fix any issues
- [x] 8.3 Verify Storybook starts and all new stories render correctly (`npm run storybook` in `packages/frontend/react`)
