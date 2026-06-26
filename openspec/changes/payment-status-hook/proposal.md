## Why

Merchants integrating `@fluxisus/react` have no way to know when a payment lands once `FluxisQrCode` is rendered — they must hand-roll polling against their own backend from scratch every time. `usePaymentStatus` is already referenced as a hook-naming convention example in `packages/frontend/CLAUDE.md`, but it has never been implemented. This is also a blocking dependency for two near-term follow-ups: clock-skew-aware token expiration UI, and a manual "I already paid" sync affordance in checkout flows.

## What Changes

- Add a new `usePaymentStatus(statusUrl, options?)` hook to `@fluxisus/react` that polls a merchant-supplied backend route (never the Fluxis API directly) and returns `{ status, data, error, isPolling, refetch }`.
- Auto-stop polling on terminal statuses (`completed`, `expired`, `failed`, `overpaid`, `underpaid`); configurable interval with exponential backoff on errors; `enabled` flag to pause without unmounting; cleanup on unmount.
- Add a `refetch()` escape hatch for on-demand, user-triggered status checks (e.g. an "I already paid" button), sharing the same error handling as interval polls.
- Capture clock-skew offset (`serverDate - Date.now()`) from the `Date` response header on every successful response, and expose it via `FluxisProvider` context for use by other components. Silent fallback to offset `0` when the header is missing or blocked (e.g. not CORS-exposed) — never throws.
- Document the merchant-side backend proxy pattern and the `Access-Control-Expose-Headers: Date` requirement for cross-origin status endpoints.

## Capabilities

### New Capabilities
- `payment-status-polling`: Client-side hook and context for polling merchant-backend payment status with manual refetch and clock-skew offset capture.

### Modified Capabilities
(none — no existing specs in `openspec/specs/` yet)

## Impact

- Affected package: `packages/frontend/react` (`@fluxisus/react`).
- New files under `src/hooks/` (the hook) and changes to `FluxisProvider` context to expose the clock-skew offset.
- No changes to backend SDKs or API contracts. No new dependencies. No breaking changes — purely additive.
- README updates documenting the required merchant-side backend route and the CORS header requirement for cross-origin status endpoints.
