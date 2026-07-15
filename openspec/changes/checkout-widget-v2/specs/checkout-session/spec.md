## ADDED Requirements

### Requirement: CheckoutSession supports asset selection
The `CheckoutSession` TypeScript interface SHALL support a `selecting_asset` status and an optional `payment_options: string[]` field, for sessions where the shopper must choose an asset before a vault is assigned (payment-link-originated sessions with multiple configured options).

#### Scenario: Session awaiting asset selection
- **WHEN** the backend returns `status: "selecting_asset"` and a `payment_options` array
- **THEN** `CheckoutSession.status` SHALL accept the value `'selecting_asset'` and `CheckoutSession.payment_options` SHALL be typed `string[] | undefined` and SHALL carry the value

#### Scenario: Session without payment_options
- **WHEN** the backend response omits `payment_options` (any status other than `selecting_asset`)
- **THEN** `CheckoutSession.payment_options` SHALL be `undefined`

### Requirement: CheckoutWidget renders an asset picker for selecting_asset sessions
`CheckoutWidget` SHALL render a new `AssetSelectionScreen` when `session.status === 'selecting_asset'`, listing the options in `session.payment_options`. `CheckoutWidgetProps` SHALL accept an optional `onSelectAsset: (assetId: string) => void | Promise<void>` callback, invoked when the shopper picks an option. `AssetSelectionScreen` SHALL NOT perform its own network request — submitting the selection to the backend is the responsibility of the code that supplies `onSelectAsset`.

#### Scenario: Shopper selects an asset
- **WHEN** `session.status === 'selecting_asset'` and the shopper clicks one of the rendered `payment_options`
- **THEN** `onSelectAsset` SHALL be called with the selected asset identifier, and the screen SHALL show a loading state until the returned promise settles

#### Scenario: onSelectAsset not provided
- **WHEN** `session.status === 'selecting_asset'` and no `onSelectAsset` prop was supplied
- **THEN** `AssetSelectionScreen` SHALL still render the options list without throwing, in a disabled/no-op state

### Requirement: CompletedScreen auto-redirects after a countdown
`CompletedScreen` SHALL start a 5-second countdown on mount and navigate to `returnUrl` automatically when it elapses, unless the shopper has already navigated away (e.g. by clicking the manual link). The manual "Volver al comercio" link SHALL remain present and SHALL redirect immediately when clicked, independent of the countdown. The countdown timer SHALL be cleared on component unmount.

#### Scenario: Shopper takes no action
- **WHEN** `CompletedScreen` renders and 5 seconds elapse with no manual click
- **THEN** the browser navigates to `returnUrl` automatically

#### Scenario: Shopper clicks the manual link before the countdown elapses
- **WHEN** the shopper clicks "Volver al comercio" before 5 seconds have elapsed
- **THEN** the browser navigates to `returnUrl` immediately, and no duplicate navigation occurs when the countdown would have elapsed

#### Scenario: Component unmounts before the countdown elapses
- **WHEN** `CompletedScreen` is unmounted (e.g. the shopper navigates within the host app) before 5 seconds elapse
- **THEN** the pending timer is cleared and no navigation occurs after unmount
