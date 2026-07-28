## ADDED Requirements

### Requirement: CountdownTimer displays remaining time
The `CountdownTimer` component SHALL accept an `expiresAt` ISO 8601 string and render the remaining time as `mm:ss`, updating every second. When the remaining time reaches zero it SHALL stop ticking.

#### Scenario: Normal countdown display
- **WHEN** `expiresAt` is more than 2 minutes in the future
- **THEN** the timer renders in the default foreground color as `mm:ss` (e.g. "14:32")

#### Scenario: Amber urgency at 2 minutes remaining
- **WHEN** remaining time drops to 120 seconds or fewer (but more than 30)
- **THEN** the timer text color transitions to amber (`#d97706`)

#### Scenario: Red urgency at 30 seconds remaining
- **WHEN** remaining time drops to 30 seconds or fewer
- **THEN** the timer text color transitions to red (`#dc2626`) and font-weight becomes 700

#### Scenario: Timer reaches zero
- **WHEN** remaining time reaches 0
- **THEN** the display shows "00:00", the interval stops, and `onExpire()` is called if provided

#### Scenario: Already-expired session
- **WHEN** `expiresAt` is in the past on mount
- **THEN** the display shows "00:00" immediately and `onExpire()` is called on mount

### Requirement: PendingScreen integrates CountdownTimer
PendingScreen SHALL replace the static "Expira a las" detail row with a live "Expira en" row that renders the `CountdownTimer` component inline.

#### Scenario: Live row visible on pending session
- **WHEN** PendingScreen renders with a future `expires_at`
- **THEN** a row labeled "Expira en" shows a ticking `mm:ss` countdown

### Requirement: Expiry overlay locks PendingScreen
When `CountdownTimer` fires `onExpire`, PendingScreen SHALL render a full-widget semi-transparent overlay indicating expiry, keeping it visible until the polling transitions the widget to the expired screen.

#### Scenario: Overlay appears on timer expiry
- **WHEN** `CountdownTimer.onExpire` fires (timer hits 0)
- **THEN** an overlay covers the widget with text "Este pago ha expirado" and "Actualizando…"

#### Scenario: Overlay dismissed by poll
- **WHEN** the next 3-second poll returns `status: expired`
- **THEN** the router navigates to the expired screen and the overlay is no longer visible
