## ADDED Requirements

### Requirement: CheckoutSession return_url is optional

The `CheckoutSession` TypeScript interface SHALL declare `return_url` as optional
(`return_url?: string`). The backend serializes this field with `omitempty` and omits it
entirely for a point of sale with no configured return URL, so a required declaration
misrepresents the contract and lets consumers dereference a value that is absent at runtime.

#### Scenario: Backend omits return_url

- **WHEN** the backend response contains no `return_url` key
- **THEN** `session.return_url` SHALL be `undefined`, and consumer code reading it SHALL
  type-check without a non-null assertion

#### Scenario: Backend sends return_url

- **WHEN** the backend response contains a non-empty `return_url`
- **THEN** `session.return_url` SHALL be that string

## MODIFIED Requirements

### Requirement: CompletedScreen auto-redirects after a countdown

`CompletedScreen` SHALL start a 12-second countdown on mount **only when `returnUrl` is a
non-empty string**, and navigate to `returnUrl` automatically when it elapses, unless the
shopper has already navigated away (e.g. by clicking the manual link). When `returnUrl` is
absent or empty, no countdown SHALL start and no automatic navigation SHALL occur. The manual
"Volver al comercio" link SHALL be rendered only when `returnUrl` is present, and SHALL redirect
immediately when clicked, independent of the countdown. The countdown timer SHALL be cleared on
component unmount.

#### Scenario: Shopper takes no action and a return URL is configured

- **WHEN** `CompletedScreen` renders with a non-empty `returnUrl` and 12 seconds elapse with no
  manual click
- **THEN** the browser navigates to `returnUrl` automatically

#### Scenario: No return URL is configured

- **WHEN** `CompletedScreen` renders with `returnUrl` undefined or empty, and any amount of time
  elapses
- **THEN** no countdown SHALL be displayed, no "Volver al comercio" link SHALL be rendered, and
  the browser SHALL NOT navigate away

#### Scenario: Shopper clicks the manual link before the countdown elapses

- **WHEN** the shopper clicks "Volver al comercio" before 12 seconds have elapsed
- **THEN** the browser navigates to `returnUrl` immediately, and no duplicate navigation occurs
  when the countdown would have elapsed

#### Scenario: Component unmounts before the countdown elapses

- **WHEN** `CompletedScreen` is unmounted (e.g. the shopper navigates within the host app)
  before 12 seconds elapse
- **THEN** the pending timer is cleared and no navigation occurs after unmount
