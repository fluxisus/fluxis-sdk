## Context

`CheckoutWidget` (`packages/frontend/react/src/components/CheckoutWidget.tsx`) is a pure status-driven display component: it takes a `session: CheckoutSession` prop and dispatches to a sub-screen (`PendingScreen`, `ConfirmingScreen`, `CompletedScreen`, `ExpiredScreen`). It has never made a network call — polling and any future writes are the consumer's responsibility (`checkout-web` currently polls `GET /public/checkout/:sessionId` via TanStack Query and hands the refreshed `session` back down).

`core-api`'s `hosted-checkout-session-api-v2` change adds a `selecting_asset` status and `payment_options` array to the session contract, plus `POST /public/checkout/:sessionId/select-asset` for submitting the shopper's choice. This package needs to represent that state and provide a hook for the consumer to act on it, without breaking the "widget only displays, consumer fetches" boundary the package's own `CLAUDE.md` documents.

## Goals / Non-Goals

**Goals:**
- Represent `selecting_asset` + `payment_options` in `CheckoutSession` and render an asset picker for it.
- Let the consumer (checkout-web) drive the actual `select-asset` network call via a callback, not the widget itself.
- Auto-redirect on completion after a short countdown, without removing the manual link.

**Non-Goals:**
- The widget will not gain its own HTTP client or `apiBaseUrl` configuration — that would be the first network call ever made inside this package and would contradict its documented design rule. If a future change decides the widget should own polling entirely, that's a separate, larger design decision.
- No changes to `PendingScreen`'s existing single-asset behavior.

## Decisions

### 1. `onSelectAsset` callback, not an internal fetch

**Decision:** `CheckoutWidgetProps.onSelectAsset?: (assetId: string) => void | Promise<void>`. `AssetSelectionScreen` renders `payment_options` as buttons/list items and calls `onSelectAsset(option)` on click, showing a loading state while the returned promise is pending. The consumer is responsible for calling `POST /public/checkout/:sessionId/select-asset` and re-polling.

**Rationale:** Keeps parity with how the widget already works for reads (consumer polls, hands `session` down) and avoids introducing the first network dependency into a package whose stated design principle is "backend creates, frontend displays." checkout-web already owns a `fetchCheckoutSession` function in `src/lib/api.ts`; adding a sibling `selectCheckoutAsset` function there is a one-line addition, versus teaching the SDK package to know about API base URLs, error envelopes, and retry semantics.

**Alternative considered:** Give `CheckoutWidget` an `apiBaseUrl` prop and have `AssetSelectionScreen` fetch directly. Rejected — duplicates fetch/error-handling logic the consumer already has, and is inconsistent with every other screen in the widget.

### 2. `selecting_asset` dispatch in `CheckoutWidget`

**Decision:** Add a branch in `CheckoutWidget` before the `PendingScreen` fallback:
```tsx
if (session.status === 'selecting_asset') {
  return <AssetSelectionScreen session={session} onSelectAsset={onSelectAsset} className={className} style={mergedStyle} />;
}
```
`payment_options` is only meaningful in this state; `AssetSelectionScreen` reads it directly off `session`.

### 3. `CompletedScreen` auto-redirect with countdown

**Decision:** On mount, `CompletedScreen` starts a 5-second timer (`useEffect` + `setTimeout`) that calls `window.location.href = returnUrl` if not already navigated away. The existing anchor's `onClick` (or a wrapping handler) clears the timer implicitly (navigation happens immediately on click regardless). Show the countdown next to the link (e.g. "Volver al comercio (5)") so the auto-redirect isn't a surprise, decrementing each second.

**Rationale:** Matches the sequence diagram's "redirect to return_url" arrow while preserving the manual click for shoppers who want to act immediately or who want to read the receipt link first (clicking the receipt link should not trigger the countdown's redirect — only the "Volver al comercio" action does, so the countdown must not fire while focus/interaction is on the receipt link). Component unmount (e.g. widget removed from DOM) must clear the timer to avoid a stray navigation after unmount.

## Risks / Trade-offs

- **Auto-redirect surprising shoppers mid-read of a receipt link:** mitigated by showing a visible countdown and keeping the timer cancellable only via navigation, not via other interactions — acceptable per the design brief's explicit ask for a 5s timeout.
- **`onSelectAsset` is optional:** if a consumer built against the pre-`selecting_asset` contract receives a session in that state without supplying the callback, `AssetSelectionScreen` should still render the options list but no-op (or render a disabled state) rather than throw. Document this clearly in the README so consumers upgrading `CheckoutSession`-producing backends know to also pass the callback.

## Migration Plan

1. Ship this package version independent of core-api's `hosted-checkout-session-api-v2` — backward compatible, since `selecting_asset` is a new enum value existing consumers never produce.
2. checkout-web bumps its `@fluxisus/react` dependency (via yalc during local dev, then the published version) once both this change and core-api's change are available, and wires `onSelectAsset` to a new `selectCheckoutAsset` function in `src/lib/api.ts`.
3. Rollback: revert the package version bump in checkout-web; no server-side state affected.
