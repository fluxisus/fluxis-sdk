## ADDED Requirements

### Requirement: CountdownTimer displays time remaining in MM:SS format
`CountdownTimer` SHALL accept an `expiresAt` ISO timestamp string and display the time remaining until expiry in `MM:SS` format, updating every second.

#### Scenario: Normal countdown display
- **WHEN** the expiry is more than 2 minutes away
- **THEN** the timer displays the remaining time in `MM:SS` with no urgency styling

#### Scenario: Amber urgency under 2 minutes
- **WHEN** fewer than 120 seconds remain
- **THEN** the timer text color changes to amber

#### Scenario: Red urgency under 60 seconds
- **WHEN** fewer than 60 seconds remain
- **THEN** the timer text color changes to red

#### Scenario: Timer reaches zero
- **WHEN** the computed remaining time reaches zero or goes negative
- **THEN** the timer displays `00:00` and MUST NOT display a negative value

### Requirement: CountdownTimer calls onExpire callback at zero
`CountdownTimer` SHALL accept an optional `onExpire` callback and call it exactly once when the countdown reaches zero.

#### Scenario: onExpire fires at expiry
- **WHEN** the countdown reaches `00:00`
- **THEN** `onExpire` is called exactly once

#### Scenario: onExpire not called before expiry
- **WHEN** time is still remaining
- **THEN** `onExpire` is NOT called

### Requirement: CountdownTimer corrects for server clock skew
`CountdownTimer` SHALL use `useServerTimeOffset` to read the current `offsetMs` value and apply it when computing remaining time: `remaining = expiresAt - (Date.now() + offsetMs)`.

#### Scenario: Clock-skew offset applied
- **WHEN** `FluxisServerTimeContext` provides a non-zero `offsetMs`
- **THEN** the displayed remaining time reflects the corrected clock

#### Scenario: Zero offset without FluxisProvider
- **WHEN** no `FluxisProvider` wraps the component
- **THEN** `offsetMs` defaults to `0` and the timer displays wall-clock remaining time without error

### Requirement: CountdownTimer accepts optional className prop
`CountdownTimer` SHALL accept an optional `className` prop applied to its root element.

#### Scenario: className forwarded to root
- **WHEN** a `className` prop is provided
- **THEN** it is present on the rendered root element
