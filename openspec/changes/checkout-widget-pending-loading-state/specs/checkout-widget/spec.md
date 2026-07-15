## MODIFIED Requirements

### Requirement: CheckoutWidget renders status-appropriate layout
`CheckoutWidget` SHALL accept a `CheckoutSession` prop and render a distinct layout for each of the four statuses: `pending`, `confirming`, `completed`, and `expired`. It SHALL be purely presentational — it MUST NOT perform any internal data fetching or start any polling.

#### Scenario: Pending status without recipient_address renders waiting spinner
- **WHEN** `session.status` is `"pending"` and `session.recipient_address` is absent
- **THEN** the widget renders a centered loading spinner and a waiting message; it MUST NOT render `FluxisQrCode`, `CompatibleApps`, or `AddressCopyButton`

#### Scenario: Pending status with recipient_address renders payment screen
- **WHEN** `session.status` is `"pending"` and `session.recipient_address` is present
- **THEN** the widget renders `AmountDisplay`, `CountdownTimer`, `FluxisQrCode` (with `session.recipient_address` as the token), `CompatibleApps`, and `AddressCopyButton`

#### Scenario: Confirming status renders holding screen
- **WHEN** `session.status` is `"confirming"`
- **THEN** the widget renders a loading spinner and the text "Payment detected, confirming on-chain…"

#### Scenario: Completed status renders success screen
- **WHEN** `session.status` is `"completed"`
- **THEN** the widget renders a checkmark icon and a "Return to merchant" link pointing to `session.return_url`

#### Scenario: Expired status renders expired screen
- **WHEN** `session.status` is `"expired"`
- **THEN** the widget renders an expiry message and an option to start over (e.g., reload or navigate away)

## MODIFIED Requirements

### Requirement: CheckoutSession type is exported
The `CheckoutSession` interface SHALL be exported from `src/index.ts` so that consumer applications can import the type and avoid duplicating it.

#### Scenario: Type import from package root
- **WHEN** a consumer imports `CheckoutSession` from `@fluxisus/react`
- **THEN** the import resolves without error and the type includes `id`, `amount`, `currency`, `recipient_address` (optional), `expires_at`, `status`, and `return_url`
