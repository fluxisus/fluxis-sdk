## ADDED Requirements

### Requirement: Manual-transfer step indicator reflects real progress
The `StepIndicator` shown above the manual-transfer accordion's content (`Token → Red → Pagar`) SHALL reflect actual shopper progress, not a fixed/hardcoded state. It SHALL show no steps as done while an asset is still unresolved, and SHALL show `Token`/`Red` as done (not `Pagar`) once an asset has been resolved and transfer details are shown.

#### Scenario: Asset not yet resolved
- **WHEN** the manual-transfer accordion is expanded and `session.manual_transfer` is not yet populated (asset picker showing)
- **THEN** none of the three steps render as done

#### Scenario: Asset resolved, awaiting payment
- **WHEN** the manual-transfer accordion is expanded and `session.manual_transfer` is populated (transfer details showing)
- **THEN** `Token` and `Red` render as done and `Pagar` does not, since payment itself is never observable as complete from this component (it unmounts once payment is detected)
