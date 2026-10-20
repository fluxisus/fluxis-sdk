## ADDED Requirements

### Requirement: Host-agnostic payer API
The Android (`FluxisBlePayer`) and iOS (`FluxisBLEPayer`) SDKs SHALL expose `discover`, `readPreview(candidate)` and `readNearestPreview`, returning a preview with the record, session id and content (NASPIP token or POS id). They SHALL NOT call the Fluxis API or depend on wallet code.

#### Scenario: Hold the phone near the POS
- **WHEN** a wallet calls `readNearestPreview()` near an advertising collector
- **THEN** it receives a preview whose token equals the collector's NASPIP token, after a short connect, read and disconnect

#### Scenario: Picker flow
- **WHEN** a wallet calls `discover()`
- **THEN** it receives candidates with display name, amount hint and RSSI, strongest signal first

### Requirement: Typed failures
Payer operations SHALL fail with a typed error whose reason distinguishes Bluetooth unavailable or off, permission denied, not found, connection failure, not supported (no PREVIEW), invalid value, timeout and, on iOS, cancellation.

#### Scenario: Collector without PREVIEW
- **WHEN** the connected device serves RECORD but not PREVIEW
- **THEN** the payer fails with reason `notSupported` / `NOT_SUPPORTED`

#### Scenario: Mismatched session
- **WHEN** RECORD and PREVIEW carry different session ids
- **THEN** the payer fails with reason `invalid`

### Requirement: Transport-independent payer flow
The Swift payer read sequence SHALL run over a link abstraction (`FluxisBLEReadLink`, `PreviewFlow`) so it can be tested without Bluetooth on every CI platform.

#### Scenario: Flow tested on Linux
- **WHEN** `swift test` runs on Linux
- **THEN** `PreviewFlow` reads the vector preview over an in-memory link
