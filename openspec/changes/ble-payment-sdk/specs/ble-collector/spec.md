## ADDED Requirements

### Requirement: Start a collector session from a NASPIP token
The Android SDK SHALL provide `FluxisBleCollector(context).start(token, amount, displayName, posId)`. It validates the input synchronously, then generates a session id, opens a GATT server with RECORD and PREVIEW, and advertises the Fluxis service UUID. Progress SHALL be observable through a `StateFlow<CollectorState>` and an optional listener.

#### Scenario: Session starts advertising
- **WHEN** the host calls `start` with a valid token on a device with Bluetooth on and permissions granted
- **THEN** the state moves `preparing` → `advertising` once advertising has started

#### Scenario: Invalid input
- **WHEN** the host calls `start` with an empty token, or a token over 494 bytes without a POS id
- **THEN** `start` throws and no Bluetooth resources are opened

### Requirement: Serve every payer until stopped
The collector SHALL keep advertising and answering reads of RECORD and PREVIEW, for any number of payers, until the host calls `stop()` or a failure occurs. It SHALL reject writes, disconnect peers idle for 15 seconds, and never report a payment: the host learns the sale was paid from its backend.

#### Scenario: Wallet reads the preview
- **WHEN** a payer completes a read of PREVIEW
- **THEN** `previewReads` increments and the state stays `advertising`

#### Scenario: Host stops the session
- **WHEN** the host calls `stop()` after its backend reports the payment
- **THEN** advertising stops, peers are disconnected, the GATT server is closed and the state becomes `stopped`

### Requirement: Android 8–14 compatibility, including targetSdk ≤ 30 hosts
The Android library SHALL run on API 26+, guard every newer API, and report the runtime permissions a host needs based on both the device API level and the host's `targetSdkVersion`.

#### Scenario: Clover app targeting SDK 29 on Android 13
- **WHEN** `FluxisBlePermissions.required(context, COLLECTOR)` runs on API 33 in an app targeting 29
- **THEN** it returns no runtime permissions, because the legacy install-time `BLUETOOTH`/`BLUETOOTH_ADMIN` apply

#### Scenario: Android 10 POS
- **WHEN** the same call runs on API 29 in an app targeting 29
- **THEN** it returns `ACCESS_FINE_LOCATION`

#### Scenario: Missing permission at runtime
- **WHEN** a required permission is not granted when the session starts
- **THEN** the state becomes `failed` with detail `server_failed:missing_permission:<permissions>`
