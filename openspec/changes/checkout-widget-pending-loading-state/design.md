## Context

`CheckoutWidget` is a purely presentational component. It receives a `CheckoutSession` from the caller and renders one of four screens based on `status`. The backend's `pending` status covers two real sub-states: (1) waiting for the shopper to select a crypto asset — no vault assigned, no `recipient_address`; (2) vault assigned, QR ready — `recipient_address` present. The widget currently has no awareness of this distinction.

## Goals / Non-Goals

**Goals:**
- Render a loading spinner when `status === "pending"` and `recipient_address` is absent
- Preserve the existing QR + wallet UI when `status === "pending"` and `recipient_address` is present
- Make `recipient_address` optional in `CheckoutSession` to reflect real API behavior

**Non-Goals:**
- Adding a new status value — the two sub-states remain under `"pending"`; no protocol change
- Changing polling behavior — `checkout-web` already polls every 3s for `"pending"` and `"confirming"`
- Styling changes beyond matching the existing spinner from `ConfirmingScreen`

## Decisions

### Guard on `recipient_address` in `PendingScreen`, not in `CheckoutWidget`

`CheckoutWidget` routes by `status`. Adding a second routing branch at the `CheckoutWidget` level (e.g., a new internal status) would complicate the status switch and diverge from the simple one-status → one-screen model. Instead, the guard lives inside `PendingScreen`: if `recipient_address` is falsy, render the waiting view; otherwise render the existing QR view. This keeps the routing table unchanged.

### Reuse `ConfirmingScreen` spinner rather than introducing a new animation

`ConfirmingScreen` already has a spinner with the correct visual style. Extract the spinner markup (or a shared component if one exists) and reuse it in `PendingScreen`'s waiting view. If the spinner is inline CSS/JSX, duplicate the minimal markup — do not abstract prematurely.

### `recipient_address?: string` — optional, not `string | undefined` union

Making the field optional (`?`) instead of a required-but-nullable union matches the backend contract (field is absent, not null) and avoids forcing callers to pass `undefined` explicitly. This is the least-breaking change.

## Risks / Trade-offs

- **Consumers who always pass `recipient_address`**: No impact — optional field is backwards-compatible.
- **TypeScript strict callers who spread `CheckoutSession` into another required type**: May need to update their local type. Risk is low since `CheckoutSession` is an input type (widget consumer sets it), not an output type from the SDK.
- **Spinner message copy**: Hard-coded for now ("Preparando tu pago…" or similar). A follow-up could expose a prop for localisation if needed.
