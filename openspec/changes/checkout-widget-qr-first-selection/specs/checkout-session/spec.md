## MODIFIED Requirements

### Requirement: CheckoutWidget renders an asset picker for selecting_asset sessions
`CheckoutWidget` SHALL render `PendingScreen` (not a standalone full-screen component) when `session.status === 'selecting_asset'`, identical to the `pending` case, showing the QR (`FluxisQrCode`, keyed on `session.recipient_address`) immediately if present. `AssetSelectionScreen`, listing the options in `session.payment_options`, SHALL render inside `PendingScreen`'s manual-transfer accordion instead — reachable by expanding "Transferencia manual" — rather than as a top-level full-screen picker. `CheckoutWidgetProps` SHALL continue to accept an optional `onSelectAsset: (assetId: string) => void | Promise<void>` callback, passed through to wherever `AssetSelectionScreen` renders. `AssetSelectionScreen` SHALL NOT perform its own network request — submitting the selection to the backend remains the responsibility of the code that supplies `onSelectAsset`.

#### Scenario: Selecting_asset session with an undecided token shows the QR immediately
- **WHEN** `session.status === 'selecting_asset'` and `session.recipient_address` is populated (an undecided NASPIP token)
- **THEN** `CheckoutWidget` renders the same QR-first layout as a `pending` session, without requiring the shopper to pick an asset first

#### Scenario: Shopper opens manual transfer before picking an asset
- **WHEN** `session.status === 'selecting_asset'` and the shopper expands "Transferencia manual"
- **THEN** the accordion shows `AssetSelectionScreen`'s option list (from `session.payment_options`), not amount/address details

#### Scenario: Shopper selects an asset
- **WHEN** the shopper clicks one of the rendered `payment_options` inside the manual-transfer accordion
- **THEN** `onSelectAsset` SHALL be called with the selected asset identifier, and the picker SHALL show a loading state until the returned promise settles

#### Scenario: onSelectAsset not provided
- **WHEN** `session.status === 'selecting_asset'` and no `onSelectAsset` prop was supplied
- **THEN** `AssetSelectionScreen` SHALL still render the options list without throwing, in a disabled/no-op state

#### Scenario: Session resolves to a specific asset
- **WHEN** `session.manual_transfer` becomes populated (a vault has been assigned, whether via the manual-transfer accordion's picker or a wallet resolving the undecided QR itself)
- **THEN** the manual-transfer accordion, if expanded, SHALL show `ManualTransferContent` (amount/address/QR) in place of the picker, without a full-screen transition
