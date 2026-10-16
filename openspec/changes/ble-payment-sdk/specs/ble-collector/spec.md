## ADDED Requirements

### Requirement: Start a collector session from a NASPIP token
The Android SDK SHALL provide `FluxisBleCollector(context).start(token, amount, displayName, ttlSeconds)`. It validates the input synchronously, then generates an ephemeral key pair and session id, opens the GATT server, and advertises the Fluxis service UUID. Progress SHALL be observable through a `StateFlow<CollectorState>` and an optional listener.

#### Scenario: Session becomes ready
- **WHEN** the host calls `start` with a valid token on a device with Bluetooth on and permissions granted
- **THEN** the state moves `preparing` → `ready` once advertising has started

#### Scenario: Invalid input
- **WHEN** the host calls `start` with an empty token, a token over 4067 bytes, or a TTL outside 1–300 seconds
- **THEN** `start` throws and no Bluetooth resources are opened

### Requirement: Deliver to exactly one payer
The collector SHALL lock to the first peer that sends a valid START, stop advertising, deliver the sealed token as confirmed indications, and report `delivered` only after verifying the payer's ACK. Other peers sending START while it is locked SHALL receive BUSY.

#### Scenario: Successful delivery
- **WHEN** a payer completes START and returns a valid ACK
- **THEN** the state becomes `delivered`, the payer is disconnected after 250 ms, and the GATT server is closed

#### Scenario: Concurrent payer
- **WHEN** a second payer sends START while the collector is `claimed`
- **THEN** that payer receives BUSY and is disconnected, and the first delivery continues

### Requirement: Re-arm after a failed attempt
Unless configured otherwise, the collector SHALL return to `ready` and advertise the same record after a failed attempt (disconnect, timeout, ABORT, bad ACK) for as long as the session hasn't expired.

#### Scenario: Payer walks away mid-handshake
- **WHEN** the claimed payer disconnects before sending ACK
- **THEN** the collector goes back to `ready` and another payer can claim the token

#### Scenario: Expiry
- **WHEN** `expiresAt` passes before delivery
- **THEN** the state becomes `expired`, advertising stops and every peer is disconnected

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
