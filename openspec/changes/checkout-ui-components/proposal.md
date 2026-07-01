## Why

The `checkout-web` hosted payment page currently renders raw JSON — there are no UI components to show the payer a real checkout experience. The `@fluxisus/react` SDK already provides low-level primitives (QR, wallet deep-links, theming) but lacks the composed widget and supporting display components needed to turn a `CheckoutSession` into a polished, status-aware payment UI.

## What Changes

- Add `CheckoutWidget` — a purely presentational component that renders the correct layout for each payment session status (`pending`, `confirming`, `completed`, `expired`). No internal fetching; the host app owns polling.
- Add `CountdownTimer` — displays time remaining until token expiry, with clock-skew correction via `useServerTimeOffset`. Turns amber under 2 min, red under 60 s; fires `onExpire` callback at zero.
- Add `AddressCopyButton` — shows a truncated recipient address with one-click clipboard copy and a 2-second "Copied!" feedback state.
- Add `PaymentStatusBadge` — colored pill reflecting the current session status.
- Add `AmountDisplay` — formats and renders the payment amount and currency.
- Export `CheckoutSession` interface and all component prop types from `src/index.ts`.
- Add Storybook stories covering every visual state for each new component.
- All components use CSS variable fallbacks; they render correctly without `FluxisProvider`.

## Capabilities

### New Capabilities

- `checkout-widget`: Composed status-aware checkout UI that renders the full payment experience for a given `CheckoutSession` by composing existing SDK primitives and new supporting components.
- `countdown-timer`: Self-ticking expiry countdown with server-clock-skew correction, urgency color transitions, and an `onExpire` escape hatch.
- `address-copy-button`: Truncated address display with clipboard copy and transient feedback.
- `payment-status-badge`: Semantic status pill for all `CheckoutSession` statuses.
- `amount-display`: Formatted payment amount and currency display.

### Modified Capabilities

## Impact

- **`packages/frontend/react/src/components/`** — five new component directories
- **`packages/frontend/react/src/types.ts`** — new `CheckoutSession` interface and five component prop types
- **`packages/frontend/react/src/index.ts`** — six new exports (components + `CheckoutSession`)
- **Storybook** (`packages/frontend/react/src/stories/`) — new story files for each component
- **No breaking changes** to existing exports (`FluxisQrCode`, `CompatibleApps`, `FluxisProvider`, `usePaymentStatus`)
- **`checkout-web`** (separate repo) — will consume `CheckoutWidget` after `yalc publish`; no changes in this SDK PR
