## Why

PendingScreen shows a static "Expira a las HH:MM" label that gives shoppers no sense of urgency and no proactive feedback when their session expires mid-payment. A live countdown with color cues and an expiry overlay prevents confusion and reduces abandoned payments caused by silent session expiry.

## What Changes

- New `CountdownTimer` component added to `@fluxisus/react` — displays `mm:ss` remaining, transitions to amber (≤ 2 min) and red/bold (≤ 30 s), calls `onExpire` callback at zero
- `PendingScreen` replaces the static "Expira a las" `DetailRow` with a live "Expira en" row rendering `<CountdownTimer>`
- `PendingScreen` gains an expired-overlay state: when the timer fires `onExpire`, a semi-transparent overlay shows "Este pago ha expirado — Actualizando…" until the next poll transitions to the expired screen

## Capabilities

### New Capabilities
- `checkout-countdown-timer`: Live session expiry countdown with color urgency cues and an expiry overlay on PendingScreen

### Modified Capabilities
<!-- none — no existing spec-level behavior changes -->

## Impact

- **SDK**: `packages/frontend/react/src/components/checkout/CountdownTimer.tsx` (new), `PendingScreen.tsx` (modified), `index.ts` (export)
- **checkout-web**: No changes needed — widget update propagates via yalc/npm
- **No breaking changes** — `CountdownTimer` is a new export; `PendingScreen` prop interface unchanged
