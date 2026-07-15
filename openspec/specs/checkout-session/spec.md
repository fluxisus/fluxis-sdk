# checkout-session Specification

## Purpose
TBD - created by archiving change checkout-tx-explorer-receipt. Update Purpose after archive.
## Requirements
### Requirement: CheckoutSession includes tx_hash and receipt_link fields
The `CheckoutSession` TypeScript interface SHALL include two new optional fields to carry on-chain and receipt data from the backend.

#### Scenario: Session with tx_hash
- **WHEN** the backend returns a `tx_hash` string in the checkout session JSON
- **THEN** `CheckoutSession.tx_hash` SHALL be typed as `string | undefined` and SHALL carry the value

#### Scenario: Session with receipt_link
- **WHEN** the backend returns a `receipt_link` string in the checkout session JSON
- **THEN** `CheckoutSession.receipt_link` SHALL be typed as `string | undefined` and SHALL carry the value

#### Scenario: Session without these fields
- **WHEN** the backend response omits `tx_hash` or `receipt_link`
- **THEN** those properties SHALL be `undefined` on the parsed session object

