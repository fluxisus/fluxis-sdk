## ADDED Requirements

### Requirement: Host-agnostic payer API
The Android (`FluxisBlePayer`) and iOS (`FluxisBLEPayer`) SDKs SHALL expose `discover`, `claim(candidate)` and `claimNearest`, returning the NASPIP token and the discovery record. They SHALL NOT call the Fluxis API or depend on wallet code.

#### Scenario: Tap to pay
- **WHEN** a wallet calls `claimNearest()` near a `ready` collector
- **THEN** it receives a delivery whose `token` equals the collector's NASPIP token

#### Scenario: Picker flow
- **WHEN** a wallet calls `discover()`
- **THEN** it receives candidates with display name, amount hint, RSSI and expiry, sorted by signal strength, excluding records that expired more than 60 seconds ago

### Requirement: Typed failures
Payer operations SHALL fail with a typed error whose reason distinguishes Bluetooth unavailable or off, permission denied, not found, connection failure, busy, rejected (with the collector's ERROR code), expired, protocol error, decrypt failure, timeout and, on iOS, cancellation.

#### Scenario: Collector busy
- **WHEN** the collector answers START with BUSY
- **THEN** the payer fails with reason `busy` and the wallet can retry

#### Scenario: Collector silent
- **WHEN** no DATA, BUSY or ERROR frame arrives within 5 seconds of START
- **THEN** the payer writes ABORT `timeout` and fails with reason `timeout`

### Requirement: Transport-independent payer flow
The payer protocol logic SHALL run over a link abstraction (`FluxisBLELink` in Swift, `PayerSession` in Kotlin) so it can be tested without Bluetooth on every CI platform.

#### Scenario: Flow tested on Linux
- **WHEN** `swift test` runs on Linux
- **THEN** `PayerFlow` delivers the vector token over an in-memory collector at MTUs 23 and 185
