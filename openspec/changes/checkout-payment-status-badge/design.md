## Context

`PaymentStatusBadge` is fully implemented at `src/components/PaymentStatusBadge.tsx` and already exported from `index.ts`. Labels are currently in English. The component is not yet used anywhere in the checkout UI.

`PendingScreen` has a detail rows section (`padding: '0.25rem 1.5rem'`) containing `DetailRow` components for Monto, Expira en, and Referencia.

## Goals / Non-Goals

**Goals:**
- Localize badge labels to Spanish
- Surface the badge in `PendingScreen`'s detail rows as an "Estado" row

**Non-Goals:**
- Adding the badge to `ConfirmingScreen`, `CompletedScreen`, or `ExpiredScreen` — those screens already communicate status visually (spinner, ✓, ⏱)
- Adding animation or transitions to the badge

## Decisions

### Row implementation: custom inline div vs `DetailRow`
**Decision:** Custom inline div, same pattern as the "Expira en" CountdownTimer row.

Rationale: `DetailRow` accepts `value: string`. The badge is a `ReactNode`. Rather than modifying `DetailRow`'s props again, render a matching div inline — consistent with the precedent set by the CountdownTimer row.

### Badge placement: after "Referencia"
Referencia is the last detail row. Adding "Estado" after it keeps the logical order: amount → expiry → reference → status.

## Risks / Trade-offs

- Badge always shows `"pending"` in `PendingScreen` (since the widget only reaches `PendingScreen` when `status === 'pending'`). It won't dynamically change color while visible — that's fine because the poll transitions to a new screen when status changes.
