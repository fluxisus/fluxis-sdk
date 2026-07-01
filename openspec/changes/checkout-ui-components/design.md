## Context

`checkout-web` is a Vite + React SPA that renders a hosted payment page. It fetches a `CheckoutSession` from `core-api` and re-polls every 3 seconds via TanStack Query while the session is `pending` or `confirming`. The current `$sessionId.tsx` route dumps raw JSON — no real UI.

`@fluxisus/react` already ships: `FluxisQrCode` (NASPIP token → QR), `CompatibleApps` (wallet deep-links), `FluxisProvider` (CSS variable theme injection), and `useServerTimeOffset` (clock-skew-corrected server time). These cover the core payment display primitives; what's missing is a composed widget and the supporting display components to build a status-aware checkout screen.

Constraints from the existing SDK:
- `useServerTimeOffset` reads from `FluxisServerTimeContext` (provided by `FluxisProvider`); when called outside a provider, `offsetMs` defaults to `0` (no-op).
- CSS variable theming pattern: `var(--fluxis-color-bg, <fallback>)` — components already in the SDK follow this for standalone compatibility.
- `FluxisQrCode` accepts any string token and validates it with `isValidNaspipToken`; `recipient_address` on `CheckoutSession` is a NASPIP token and passes directly.

## Goals / Non-Goals

**Goals:**
- `CheckoutWidget` is purely presentational: accepts a `CheckoutSession` prop and renders the correct layout for each status with zero internal fetching.
- All new components work inside **and** outside `FluxisProvider` (CSS variable fallbacks for every color/radius/font reference).
- `CountdownTimer` corrects for server-clock-skew via `useServerTimeOffset`.
- `AddressCopyButton` uses `navigator.clipboard` with graceful degradation.
- Storybook stories cover every visual state for developer preview and regression.
- All new types exported from `src/index.ts` for consumption by `checkout-web`.

**Non-Goals:**
- Internal polling or fetch logic — `checkout-web` owns that via TanStack Query.
- Asset/currency selection UI — future change.
- Payment method switching.
- Cloudflare `_headers`/`_redirects` security configuration — belongs in `checkout-web`, not this SDK.

## Decisions

### 1. CheckoutWidget is purely presentational

`CheckoutWidget` receives a `CheckoutSession` and renders. No `useEffect` for timers other than the `CountdownTimer` sub-component, no internal fetch, no query client.

**Why over embedding polling:** The SDK must remain host-agnostic. Embedding TanStack Query or any fetch strategy would couple it to `checkout-web`'s polling contract and prevent reuse in other hosts.

### 2. CSS variable with explicit fallbacks on every token

All new components write every CSS token as `var(--fluxis-color-primary, #2563eb)` matching the `defaultTheme` values in `theme.ts`.

**Why over relying on FluxisProvider:** `checkout-web` will wrap its app in `FluxisProvider`, but the components must be composable in isolation (tests, Storybook without provider, third-party integration). Fallbacks make each component self-contained.

### 3. CountdownTimer uses useServerTimeOffset for clock-skew

`CountdownTimer` calls `useServerTimeOffset()` to get `offsetMs` and applies it when computing remaining time: `remaining = expiresAt - (Date.now() + offsetMs)`.

**Why:** `CheckoutSession.expires_at` is a server timestamp. Client clocks can drift. `FluxisProvider` already provides this context; reusing it keeps countdown accuracy consistent with the NASPIP token expiry logic elsewhere in the SDK. When `FluxisProvider` is absent `offsetMs` is `0` — acceptable for standalone use.

### 4. AddressCopyButton degrades gracefully without clipboard API

Copy is attempted via `navigator.clipboard.writeText`. If it throws (insecure context, permission denied), the error is swallowed and no feedback is shown — the truncated address remains visible and selectable.

**Why:** `checkout-web` is served over HTTPS so clipboard is always available in production. But Storybook and test environments run on HTTP; the component must not crash.

### 5. Urgency thresholds baked into CountdownTimer

Amber at < 2 minutes (120 s), red at < 60 seconds. These are UI constants inside the component.

**Why not props:** The thresholds are UX policy, not per-consumer customisation. Making them props would complicate the API without benefit; they can be promoted to props in a future change if needed.

### 6. Storybook — one story file per component

Each story uses `FluxisProvider` as a decorator where theming matters, with a secondary undecorated variant to confirm standalone rendering.

**Why:** Ensures each visual state is testable in isolation and confirms the "works without FluxisProvider" guarantee.

## Risks / Trade-offs

- **`navigator.clipboard` in HTTP** → copy silently fails. Mitigation: `try/catch` suppresses the error; address text remains selectable. Production (HTTPS) is unaffected.
- **CountdownTimer without FluxisProvider** → `offsetMs = 0`, no skew correction. Mitigation: `checkout-web` wraps with `FluxisProvider`; documented in component JSDoc. Acceptable for most consumers.
- **`CheckoutSession` type duplication** — the interface is defined in this SDK and also in `checkout-web/src/lib/api.ts`. If `core-api` changes the shape, both must update. Mitigation: the SDK type is the authoritative definition; `checkout-web` should import from `@fluxisus/react` after this change.
- **Storybook story coverage** — visual regression isn't automated (no Chromatic set up). Mitigation: manual review in Storybook per PR; Chromatic can be added as a future CI step.
