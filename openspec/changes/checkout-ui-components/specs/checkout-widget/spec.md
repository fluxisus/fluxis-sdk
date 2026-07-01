## ADDED Requirements

### Requirement: CheckoutWidget renders status-appropriate layout
`CheckoutWidget` SHALL accept a `CheckoutSession` prop and render a distinct layout for each of the four statuses: `pending`, `confirming`, `completed`, and `expired`. It SHALL be purely presentational — it MUST NOT perform any internal data fetching or start any polling.

#### Scenario: Pending status renders payment screen
- **WHEN** `session.status` is `"pending"`
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

### Requirement: CheckoutWidget accepts optional className and style props
`CheckoutWidget` SHALL accept optional `className` and `style` props that are applied to its root container element.

#### Scenario: Custom class applied to root
- **WHEN** a `className` prop is supplied
- **THEN** that class is present on the widget's root DOM element

### Requirement: CheckoutWidget works without FluxisProvider
`CheckoutWidget` SHALL render without throwing and SHALL display correct colors when no `FluxisProvider` ancestor is present, using CSS variable fallbacks that match `defaultTheme`.

#### Scenario: Standalone render without provider
- **WHEN** `CheckoutWidget` is rendered with no `FluxisProvider` in the tree
- **THEN** the component renders without error and applies fallback colors from `defaultTheme`

### Requirement: CheckoutSession type is exported
The `CheckoutSession` interface SHALL be exported from `src/index.ts` so that consumer applications can import the type and avoid duplicating it.

#### Scenario: Type import from package root
- **WHEN** a consumer imports `CheckoutSession` from `@fluxisus/react`
- **THEN** the import resolves without error and the type includes `id`, `amount`, `currency`, `recipient_address`, `expires_at`, `status`, and `return_url`
