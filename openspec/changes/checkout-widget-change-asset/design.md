## Context

`checkout-widget-qr-first-selection` put `AssetSelectionScreen` and `ManualTransferContent` in the
same accordion (`ManualTransferSection`), switching between them purely based on
`session.manual_transfer`'s presence. That's a one-way door: once `manual_transfer` is populated,
there was no way to get back to the picker from the UI, even though core-api's
`checkout-session-asset-reselection` now supports exactly that at the API level (calling
`select-asset` again while `created` and unexpired).

## Goals / Non-Goals

**Goals:**
- Let a shopper who picked the wrong asset get back to the picker without waiting for expiration.
- Reuse the existing accordion/picker components — no new screens.

**Non-Goals:**
- No explicit "cancel and keep the current asset" button — resubmitting the same option via the
  picker is already a no-op on the backend, which is enough for this round.
- No visual warning about funds possibly already sent to the previous address — this is a
  pre-existing risk on the backend side (see core-api's `checkout-session-asset-reselection`
  design.md), not something this frontend change introduces or is scoped to mitigate.

## Decisions

### 1. Local `isChangingAsset` state in `PendingScreen`, not session-derived

**Decision:** Whether the picker or the resolved content shows is normally derived purely from
`session.manual_transfer`'s presence — but "I want to change my mind" is a UI-only intent that has
no server-side representation until the shopper actually picks something new. `PendingScreen` adds
its own `isChangingAsset` boolean: `true` forces the picker to show even though
`session.manual_transfer` is still populated (the old data, until a new selection resolves);
resets to `false` automatically once `onSelectAsset` succeeds.

**Alternative considered:** Represent "changing" as a `session` field the backend returns.
Rejected — this is purely a client-side navigation state with no server-side meaning; inventing an
API field for it would be over-engineering for something `useState` already handles cleanly.

### 2. `onChangeAsset` gated on `session.payment_options` being present

**Decision:** `ManualTransferContent`'s `onChangeAsset` is only passed
(`session.payment_options ? () => setIsChangingAsset(true) : undefined`) when there's something to
change to. core-api omits `payment_options` for single-option sessions (nothing to pick between),
so this naturally hides the "Cambiar" link in that case without any extra frontend logic.

### 3. Reuse `handleSelectAsset` for both first-time and change selections

**Decision:** `PendingScreen` already threads `onSelectAsset` down to `AssetSelectionScreen`
regardless of whether it's rendering for `selecting_asset` or a forced "change" — same wrapped
handler (`await onSelectAsset(assetId); setIsChangingAsset(false)`) in both cases. A thrown error
propagates unchanged (not swallowed by the wrapper), so `AssetSelectionScreen`'s own inline error
state still works, and `isChangingAsset` only clears on success — a failed change attempt leaves
the picker open to retry.

## Risks / Trade-offs

- **No polling while picking**: `checkout-web`'s `refetchInterval` only polls on `pending`/
  `confirming` mapped statuses — a session already resolved (mapped `pending`) keeps polling
  through a change, so this isn't a new gap; the existing explicit `refetch()` after
  `onSelectAsset` resolves is what actually surfaces the new `manual_transfer`.
- **Depends on payment_options surviving resolution**: this only works because
  `checkout-session-payment-option-labels` also changes core-api to keep returning
  `payment_options` after a vault is assigned — these two changes ship together.

## Migration Plan

1. Ship alongside core-api's `checkout-session-asset-reselection` and
   `checkout-session-payment-option-labels` — all three land together.
2. `yalc publish`/`yalc add` to pick up in `checkout-web`.
3. Rollback: revert `ManualTransferContent`'s `onChangeAsset` prop and `PendingScreen`'s
   `isChangingAsset` state; safe to roll back independently (picker simply becomes unreachable
   again post-resolution, same as before this change).
