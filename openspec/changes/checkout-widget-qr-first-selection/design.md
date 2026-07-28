## Context

`checkout-widget-v2` added `AssetSelectionScreen` as a full-screen, top-level branch of `CheckoutWidget` for `selecting_asset` sessions — the only option available at the time, since the backend never carried any NASPIP token in that state. `checkout-session-undecided-qr` (core-api) changes that: `selecting_asset` sessions now carry an undecided NASPIP token (`recipient_address`), same field `PendingScreen` already reads for its QR. This makes the full-screen picker unnecessary for the "I have a compatible wallet" path — only manual transfer still needs it.

## Goals / Non-Goals

**Goals:**
- Show the branded QR immediately for `selecting_asset` sessions, identical to how `pending` sessions show it today — no new QR-rendering logic.
- Keep the asset picker available, but only as the entry point into manual transfer, reusing the existing accordion.
- Fix `StepIndicator` to reflect real progress while touching this code anyway.

**Non-Goals:**
- No change to `AssetSelectionScreen`'s selection logic (`handleSelect`/`pendingAssetId`/error state) — only its outer chrome.
- No change to how `onSelectAsset` is invoked or its contract (still `(assetId) => void | Promise<void>`, still the caller's responsibility to hit the backend).

## Decisions

### 1. Route `selecting_asset` through `PendingScreen`, not a separate branch

**Decision:** Remove `CheckoutWidget`'s `selecting_asset` → `AssetSelectionScreen` branch entirely; let it fall through to the same `PendingScreen` path as `pending`, passing a new `onSelectAsset` prop through. `PendingScreen`'s existing `!session.recipient_address` spinner branch, QR rendering, and detail rows need no changes — they already just render whatever `session.recipient_address` contains, undecided or resolved.

**Alternative considered:** Keep `AssetSelectionScreen` as a top-level branch, but also show a QR somewhere on that screen. Rejected — would duplicate `PendingScreen`'s QR/detail-row layout in a second place, and the two screens would drift over time (as they already had: `PendingScreen` had accrued detail rows, countdown, status badge, footer text that `AssetSelectionScreen` never had).

### 2. Generalize `ManualTransferSection` to `{ activeStep, children }`

**Decision:** The accordion shell (toggle button, chevron, border) doesn't need to know what's inside it. `PendingScreen` decides: `<ManualTransferContent data={...}/>` when resolved, `<AssetSelectionScreen session={session} onSelectAsset={onSelectAsset}/>` when not. `StepIndicator` moves here too (rendered once, above `children`) since both branches need the same stepper, just at a different `activeStep`.

### 3. `StepIndicator` `activeStep` semantics

**Decision:** `-1` while picking (nothing done — `Token`/`Red`/`Pagar` all pending), `1` once resolved (`Token`+`Red` done via the single combined asset pick; `Pagar` itself is never observable as "done" from this component, since it unmounts once payment is detected and `CheckoutWidget` switches to `ConfirmingScreen`). This was a real bug independent of the `selecting_asset` change — the hardcoded `activeStep={2}` was always wrong, just never visibly so, since `ManualTransferContent` previously only ever rendered once resolved anyway (steps already looked "done" by the time you could see them, coincidentally masking the hardcoding).

### 4. Strip `AssetSelectionScreen`'s own card chrome

**Decision:** Found live (screenshot) that nesting `AssetSelectionScreen`'s own bordered/padded/backgrounded wrapper inside `ManualTransferSection`'s already-bordered accordion body produced a visible box-in-a-box. Removed `background`/`border`/`borderRadius`/outer `padding` from `AssetSelectionScreen`'s root, replaced with `ManualTransferContent`-matching padding (`0.875rem 1rem 1rem`), and dropped the "Elegí cómo pagar" title (redundant with the `PaymentStatusBadge` label, which already reads "Elegí cómo pagar" for this exact status — confirmed via `PaymentStatusBadge.tsx`'s `STATUS_CONFIG`).

## Risks / Trade-offs

- **`AssetSelectionScreen` is no longer usable as a true standalone full-bleed screen** (its card styling is gone) — acceptable, since its only production call site is now nested; existing unit tests render it standalone but don't assert on the removed styling.
- **QR content changes on every poll** while `selecting_asset` (inherited from core-api's regeneration-per-request behavior) — pre-existing characteristic extended to a new state, not a new problem.

## Migration Plan

1. Ship alongside core-api's `checkout-session-undecided-qr` — the QR has no visible content until that change lands (`recipient_address` would be empty), but nothing breaks if sequenced either order (empty token falls back to `PendingScreen`'s spinner branch).
2. `yalc publish`/`yalc add` to pick up in `checkout-web`, restart its dev/preview server.
3. Rollback: revert `CheckoutWidget.tsx` to the standalone `AssetSelectionScreen` branch; independent of the `StepIndicator`/`ManualTransferSection` changes, which are safe to keep either way.
