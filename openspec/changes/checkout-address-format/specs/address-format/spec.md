## ADDED Requirements

### Requirement: AddressFormat renders bold endpoints and muted middle
`AddressFormat` SHALL accept an `address` string and render it in three inline segments: the first `boldChars` characters bold, the middle characters muted, and the last `boldChars` characters bold. All segments SHALL use monospace font-family.

#### Scenario: Long address splits into three segments
- **WHEN** `address.length > boldChars * 2`
- **THEN** the rendered output contains exactly three segments: `address.slice(0, boldChars)` (fontWeight 600), `address.slice(boldChars, -boldChars)` (muted color), and `address.slice(-boldChars)` (fontWeight 600)

#### Scenario: Short address renders fully bold
- **WHEN** `address.length <= boldChars * 2`
- **THEN** the entire address is rendered as a single bold segment with no muted middle

#### Scenario: Default boldChars is 8
- **WHEN** no `boldChars` prop is provided
- **THEN** the component uses 8 as the number of characters to bold at each end

### Requirement: CopyField accepts an optional display override
`CopyField` SHALL accept an optional `display?: React.ReactNode` prop. When provided, `display` SHALL be rendered in place of the plain `value` text in the visible area. The `value` prop SHALL still be used for clipboard copy regardless of `display`.

#### Scenario: display prop overrides visible text
- **WHEN** `display` is provided
- **THEN** the visible area renders `display`, not the raw `value` string

#### Scenario: clipboard always copies value
- **WHEN** the user clicks the copy button regardless of whether `display` is set
- **THEN** `navigator.clipboard.writeText` is called with the full `value` string

#### Scenario: omitting display preserves existing behaviour
- **WHEN** `display` is not provided
- **THEN** the visible area renders `value` as before (no regression)

### Requirement: ManualTransferContent uses AddressFormat for the wallet address field
The "Dirección" `CopyField` in `ManualTransferContent` SHALL pass an `<AddressFormat address={data.wallet_address} />` as its `display` prop, while keeping `value={data.wallet_address}` for clipboard copy.

#### Scenario: Dirección field shows bold endpoints
- **WHEN** `ManualTransferContent` renders with a standard-length wallet address
- **THEN** the visible address text shows bold first-8 and last-8 characters with a muted middle

#### Scenario: Importe field is unchanged
- **WHEN** `ManualTransferContent` renders
- **THEN** the "Importe" `CopyField` renders its numeric value as plain text, unaffected by this change
