## ADDED Requirements

### Requirement: Poll merchant backend for payment status
The system SHALL provide a `usePaymentStatus(statusUrl, options?)` hook that polls a merchant-supplied backend URL and never calls the Fluxis API directly or accepts API credentials.

#### Scenario: Hook polls the given URL on an interval
- **WHEN** a component calls `usePaymentStatus('/api/payment-status/123')` with no options
- **THEN** the hook fetches that URL immediately and again every default interval (~4-5s) until a terminal status is reached or the component unmounts

#### Scenario: Custom poll interval is respected
- **WHEN** a component calls `usePaymentStatus(url, { pollInterval: 10000 })`
- **THEN** the hook fetches on a 10 second cadence instead of the default

#### Scenario: Polling stops automatically on terminal status
- **WHEN** a poll response reports status `completed`, `expired`, `failed`, `overpaid`, or `underpaid`
- **THEN** the hook stops scheduling further polls and sets `isPolling` to `false`

#### Scenario: enabled flag pauses polling without unmounting
- **WHEN** a component calls `usePaymentStatus(url, { enabled: false })`
- **THEN** the hook makes no fetch calls and `isPolling` is `false`, until `enabled` becomes `true`

#### Scenario: Cleanup on unmount
- **WHEN** the component using `usePaymentStatus` unmounts while polling is active
- **THEN** the hook cancels any in-flight fetch and clears the polling timer, with no further state updates after unmount

#### Scenario: Backoff on fetch error
- **WHEN** a poll fetch fails (network error or non-2xx response)
- **THEN** the hook sets `error`, keeps `status` unchanged, and increases the delay before the next poll (exponential backoff with a capped ceiling), resetting to the configured interval after the next successful response

### Requirement: Manual on-demand refetch
The system SHALL expose a `refetch()` function from `usePaymentStatus` that performs an immediate fetch outside the regular poll cadence.

#### Scenario: refetch triggers an immediate fetch
- **WHEN** a consumer calls `refetch()` while polling is active
- **THEN** the hook performs a fetch immediately, independent of how much time remains before the next scheduled poll

#### Scenario: refetch resets the interval timer
- **WHEN** `refetch()` completes
- **THEN** the next automatic poll is scheduled a full interval after the refetch, not immediately after, so no near-duplicate poll fires right after a manual refetch

#### Scenario: refetch shares error handling with interval polls
- **WHEN** a `refetch()`-triggered fetch fails
- **THEN** the hook sets `error` the same way an interval-driven poll failure would, and does not throw

### Requirement: Clock-skew offset capture
The system SHALL capture a clock-skew offset from the `Date` response header on every successful response and expose it via `FluxisProvider` context, without ever throwing or blocking rendering if the header is unavailable.

#### Scenario: Offset computed when Date header is present
- **WHEN** a poll or refetch response includes a valid `Date` response header
- **THEN** the hook computes `offset = parsedServerDate - Date.now()` and updates the shared offset value exposed via `FluxisProvider` context

#### Scenario: Offset falls back to zero when Date header is absent or blocked
- **WHEN** no successful response has ever included a readable `Date` header (e.g. blocked by CORS on a cross-origin endpoint)
- **THEN** the shared offset value remains `0` and no error is thrown or surfaced to the consumer

#### Scenario: A single missing header does not reset a previously known offset
- **WHEN** the offset has already been set from an earlier successful response, and a later successful response lacks a readable `Date` header
- **THEN** the previously computed offset value is left unchanged rather than reset to `0`
