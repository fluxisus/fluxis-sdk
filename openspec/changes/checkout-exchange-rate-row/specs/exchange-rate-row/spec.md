## ADDED Requirements

### Requirement: ManualTransferData accepts optional fiat reference fields
`ManualTransferData` SHALL accept two optional string fields: `reference_amount` (the fiat payment amount) and `reference_currency` (the fiat currency code).

#### Scenario: Fields are optional
- **WHEN** `ManualTransferData` is constructed without `reference_amount` or `reference_currency`
- **THEN** the type is valid and no existing consumers are broken

### Requirement: PendingScreen merges fiat context into ManualTransferData
When `session.manual_transfer` is present, `PendingScreen` SHALL pass a merged object to `ManualTransferSection` that includes `reference_amount: session.amount` and `reference_currency: session.currency`.

#### Scenario: Fiat fields are threaded through
- **WHEN** `session.manual_transfer` is set and `session.amount` and `session.currency` are present
- **THEN** the `ManualTransferSection` receives a `ManualTransferData` object containing `reference_amount` equal to `session.amount` and `reference_currency` equal to `session.currency`

### Requirement: ManualTransferContent renders an exchange rate row when fiat context is present
When `data.reference_amount` and `data.reference_currency` are present and the computed rate is a finite number, `ManualTransferContent` SHALL render a "Tipo de cambio" row showing `1 {crypto_asset} = {formatted rate} {reference_currency}`.

#### Scenario: Rate row appears with valid fiat context
- **WHEN** `data.reference_amount`, `data.reference_currency`, and `data.crypto_amount` are all present and parseable as finite numbers
- **THEN** a row with label "Tipo de cambio" is rendered, and its value is `1 {crypto_asset} = ` followed by the rate formatted via `formatFiatAmount`

#### Scenario: Rate row is omitted when fiat context is absent
- **WHEN** `data.reference_amount` or `data.reference_currency` is absent
- **THEN** no "Tipo de cambio" row is rendered

#### Scenario: Rate row is omitted when rate is not finite
- **WHEN** `parseFloat(data.reference_amount) / parseFloat(data.crypto_amount)` is `NaN` or `Infinity`
- **THEN** no "Tipo de cambio" row is rendered

#### Scenario: Rate row is placed above the copy fields
- **WHEN** the rate row is rendered
- **THEN** it appears below the token pills and above the "Transfiere este importe" heading
