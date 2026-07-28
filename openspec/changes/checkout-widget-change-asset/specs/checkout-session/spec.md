## ADDED Requirements

### Requirement: Shopper can change a previously resolved asset selection
Once `session.manual_transfer` is populated (an asset has been resolved), `ManualTransferContent` SHALL offer a "Cambiar" affordance whenever `session.payment_options` is present, letting the shopper reopen the asset picker and select a different option without a full-screen transition. `PendingScreen` SHALL track this as local UI state, independent of `session` data, resetting automatically once a new selection is submitted successfully.

#### Scenario: Resolved session with more than one configured option
- **WHEN** `session.manual_transfer` is populated and `session.payment_options` is present
- **THEN** `ManualTransferContent` renders a "Cambiar" link

#### Scenario: Resolved session with only one configured option
- **WHEN** `session.manual_transfer` is populated and `session.payment_options` is absent (single-option session — nothing to change to)
- **THEN** `ManualTransferContent` does not render a "Cambiar" link

#### Scenario: Shopper clicks "Cambiar"
- **WHEN** the shopper clicks "Cambiar"
- **THEN** the manual-transfer accordion swaps from `ManualTransferContent` back to `AssetSelectionScreen`, with the full `session.payment_options` list available (including the currently active option), and the stepper drops to its unresolved state

#### Scenario: Shopper picks a new option after clicking "Cambiar"
- **WHEN** the shopper selects an option from the reopened picker and `onSelectAsset` resolves successfully
- **THEN** the accordion swaps back to `ManualTransferContent` reflecting the new selection, without a full-screen transition

#### Scenario: Change attempt fails
- **WHEN** the shopper selects an option after clicking "Cambiar" and `onSelectAsset` rejects
- **THEN** the picker stays open showing `AssetSelectionScreen`'s own inline error state, ready to retry
